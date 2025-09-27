## Updated: app/api/v1/endpoints.py - Using prediction-db-service
import os
import uuid
import shutil
import cv2
import logging
import time
from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException, Query, Request
from fastapi.responses import JSONResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from typing import Optional, Dict, Any

from app.services.grid_builder_service import GridBuilder
from app.services.predictor_service import Predictor
from app.services.result_processor_service import ResultProcessor
from app.services.redis_service import redis_service
from app.services.db_service import db_service
from app.services.image_service import ImageService
from app.services.image_uploader_service import image_uploader
from app.config import Config

# Initialize logger for this module
logger = logging.getLogger(__name__)

# Security setup: verify JWT from auth-service using HS256
bearer_scheme = HTTPBearer()

# JWT verification function
async def verify_token(credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme)):
    """Verify JWT token from auth-service"""
    try:
        token = credentials.credentials
        secret = os.getenv('JWT_ACCESS_SECRET', 'your-secret-key')
        issuer = os.getenv('JWT_ISSUER')
        audience = os.getenv('JWT_AUDIENCE')
        
        # Verify token
        payload = jwt.decode(
            token, 
            secret, 
            algorithms=['HS256'],
            issuer=issuer,
            audience=audience
        )
        
        # Return user info
        return {
            'id': payload.get('sub') or payload.get('id'),
            'email': payload.get('email'),
            'role': payload.get('role', 'user')
        }
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    except Exception as e:
        logger.error(f"Token verification error: {e}")
        raise HTTPException(status_code=401, detail="Authentication failed")

# Create router
router = APIRouter()

# define model path from config
model_path = getattr(Config, 'MODEL_PATH', None)
if not model_path:
    logger.error("MODEL_PATH not configured in Config")
    raise RuntimeError("MODEL_PATH not configured in Config")

# initialize services
grid_builder = GridBuilder()
predictor = Predictor(model_path, Config.CONFIDENCE_THRESHOLD)
processor = ResultProcessor()
image_service = ImageService()

@router.post("/predict")
async def predict_endpoint(
    request: Request,
    sample_no: str = Form(...),
    submission_no: Optional[str] = Form(None),
    file: UploadFile = File(...),
    model_version: Optional[str] = Form(None),
    confidence_threshold: Optional[float] = Form(None),
    description: Optional[str] = Form(None),
    user: Dict[str, Any] = Depends(verify_token)
):
    logger.info("Starting prediction for sample_no=%s", sample_no)
    start_time = time.time()

    # 1. Save uploaded file to disk
    upload_dir = getattr(Config, 'UPLOAD_DIR', '/tmp')
    os.makedirs(upload_dir, exist_ok=True)
    image_id = uuid.uuid4().hex
    filename = f"{image_id}_{file.filename}"
    file_path = os.path.join(upload_dir, filename)
    with open(file_path, 'wb') as f:
        shutil.copyfileobj(file.file, f)
    logger.info("Uploaded file saved to %s", file_path)

    # 2. Create a new PredictionRun record via prediction-db-service
    run_data = {
        "sampleNo": sample_no,
        "submissionNo": submission_no,
        "description": description,
        "rawImagePath": file_path,
        "modelVersion": model_version or Config.MODEL_VERSION,
        "status": "pending",
        "confidenceThreshold": confidence_threshold or Config.CONFIDENCE_THRESHOLD,
        "createdBy": user.get('id')  # Add user ID from JWT token
    }
    
    try:
        run_response = await db_service.create_prediction_run(run_data)
        run_id = run_response["data"]["id"]
        logger.info("Created PredictionRun id=%s", run_id)
    except Exception as e:
        logger.error(f"Failed to create prediction run: {e}")
        raise HTTPException(status_code=500, detail="Failed to create prediction run")

    # Log progress to Redis
    redis_service.log_progress(run_id, 10, "Image uploaded and prediction run created")

    # 2.1 Upload original image to image-ingesion-service (raw)
    minio_raw_path = None
    try:
        # Get JWT token from request headers
        jwt_token = None
        if hasattr(request, 'headers') and 'authorization' in request.headers:
            auth_header = request.headers['authorization']
            if auth_header.startswith('Bearer '):
                jwt_token = auth_header[7:]  # Remove 'Bearer ' prefix
        
        upload_result = await image_uploader.upload_image(
            sample_no=sample_no,
            run_id=run_id,
            file_path=file_path,
            file_type="raw",
            description=description or "original image",
            jwt_token=jwt_token
        )
        # Extract MinIO path from upload result
        if upload_result.get('success') and upload_result.get('data', {}).get('filePath'):
            minio_raw_path = upload_result['data']['filePath']
            logger.info("Original image uploaded to image-ingesion-service for run_id=%s, MinIO path: %s", run_id, minio_raw_path)
        else:
            logger.warning("Upload succeeded but no MinIO path returned for run_id=%s", run_id)
    except Exception as e:
        logger.warning("Failed to upload original image to image-ingesion-service: %s", e)

    # Record original image in ImageFile via prediction-db-service
    image_data = {
        "sampleNo": sample_no,
        "fileType": "raw",
        "fileName": filename,
        "filePath": minio_raw_path if minio_raw_path else file_path,
        "fileSize": os.path.getsize(file_path),
        "mimeType": file.content_type
    }
    
    # Add MinIO metadata if available
    if upload_result.get('success') and upload_result.get('data'):
        minio_data = upload_result['data']
        image_data.update({
            "bucketName": minio_data.get('bucketName'),
            "objectKey": minio_data.get('objectKey'),
            "signedUrl": minio_data.get('signedUrl'),
            "urlExpiresAt": minio_data.get('urlExpiresAt')
        })
    
    try:
        await image_service.create_image_file(image_data, jwt_token)
        logger.debug("Original image logged in ImageFile for run_id=%s", run_id)
    except Exception as e:
        logger.warning(f"Failed to log image file: {e}")

    try:
        # Update status to processing via prediction-db-service
        update_data = {"status": "processing"}
        await db_service.update_prediction_run(run_id, update_data)
        redis_service.log_progress(run_id, 20, "Starting image processing")

        # 3. Load image and draw grid
        img = cv2.imread(file_path)
        if img is None:
            raise ValueError(f"Unable to load image: {file_path}")
        
        grid_img, wells = grid_builder.draw(img)
        logger.info("Grid drawn: %d wells detected", len(wells))
        redis_service.log_progress(run_id, 40, f"Grid drawn with {len(wells)} wells detected")

        # 4. Run prediction and annotate
        annotated_img, wells = predictor.predict(grid_img, wells)
        logger.info("Prediction completed, saving results")
        redis_service.log_progress(run_id, 60, "AI prediction completed")

        # Save well predictions via prediction-db-service
        well_predictions = []
        for well in wells:
            for pred in well.get('predictions', []):
                well_predictions.append({
                    "wellId": well['label'],
                    "label": well['label'],
                    "class": pred['class'],
                    "confidence": float(pred['confidence']),
                    "bbox": pred['bbox']
                })
        
        if well_predictions:
            try:
                await db_service.create_well_predictions(run_id, well_predictions)
                logger.debug("Well predictions saved for run_id=%s", run_id)
            except Exception as e:
                logger.warning(f"Failed to save well predictions: {e}")

        # 5. Save annotated image to disk and update run
        annotated_filename = f"{image_id}_annotated.jpg"
        annotated_path = os.path.join(upload_dir, annotated_filename)
        cv2.imwrite(annotated_path, annotated_img)
        
        # 5.1 Upload annotated image to image-ingesion-service (annotated)
        minio_annotated_path = None
        annotated_upload_result = None
        try:
            annotated_upload_result = await image_uploader.upload_image(
                sample_no=sample_no,
                run_id=run_id,
                file_path=annotated_path,
                file_type="annotated",
                description="annotated image",
                jwt_token=jwt_token
            )
            # Extract MinIO signedUrl from upload result
            if annotated_upload_result.get('success') and annotated_upload_result.get('data', {}).get('signedUrl'):
                minio_annotated_path = annotated_upload_result['data']['signedUrl']
                logger.info("Annotated image uploaded to image-ingesion-service for run_id=%s, MinIO signedUrl: %s", run_id, minio_annotated_path)
            else:
                logger.warning("Upload succeeded but no MinIO signedUrl returned for run_id=%s", run_id)
                # Use direct MinIO URL as fallback
                if annotated_upload_result.get('success') and annotated_upload_result.get('data', {}).get('objectKey'):
                    object_key = annotated_upload_result['data']['objectKey']
                    minio_annotated_path = f"http://minio:9000/annotated-images/{object_key}"
                    logger.info("Using direct MinIO URL as fallback: %s", minio_annotated_path)
        except Exception as e:
            logger.warning("Failed to upload annotated image to image-ingesion-service: %s", e)

        # Record annotated image via prediction-db-service
        annotated_image_data = {
            "sampleNo": sample_no,
            "fileType": "annotated",
            "fileName": annotated_filename,
            "filePath": minio_annotated_path if minio_annotated_path else annotated_path,
            "fileSize": os.path.getsize(annotated_path),
            "mimeType": "image/jpeg"
        }
        
        # Add MinIO metadata if available
        if annotated_upload_result and annotated_upload_result.get('success') and annotated_upload_result.get('data'):
            minio_data = annotated_upload_result['data']
            annotated_image_data.update({
                "bucketName": minio_data.get('bucketName'),
                "objectKey": minio_data.get('objectKey'),
                "signedUrl": minio_data.get('signedUrl'),
                "urlExpiresAt": minio_data.get('urlExpiresAt')
            })
        
        try:
            await image_service.create_image_file(annotated_image_data, jwt_token)
            logger.info("Annotated image saved to %s and logged", annotated_path)
        except Exception as e:
            logger.warning(f"Failed to log annotated image: {e}")

        # Store annotated image path for later update (use MinIO path if available, otherwise local path)
        annotated_image_path = minio_annotated_path if minio_annotated_path else annotated_path
        logger.info("Final annotated_image_url for response: %s", minio_annotated_path)
        redis_service.log_progress(run_id, 80, "Annotated image saved")

        # 6. Process results: count by row and last positions
        counts = processor.count_by_row(wells)
        last_positions = processor.last_positions(counts)
        
        # Save row counts via prediction-db-service
        counts_data = {
            "counts": {
                "raw_count": counts,
                "last_positions": last_positions
            }
        }
        
        try:
            await db_service.create_row_counts(run_id, counts_data)
            logger.debug("Row counts saved for run_id=%s", run_id)
        except Exception as e:
            logger.warning(f"Failed to save row counts: {e}")

        # Save interface results via prediction-db-service
        distribution = processor.to_dataframe(last_positions)
        results_data = {
            "results": {
                "distribution": distribution
            }
        }
        
        try:
            await db_service.create_inference_results(run_id, results_data)
            logger.debug("Interface results saved for run_id=%s", run_id)
        except Exception as e:
            logger.warning(f"Failed to save interface results: {e}")

        # Calculate processing time
        processing_time_ms = int((time.time() - start_time) * 1000)
        
        # Update run status to completed with all fields
        update_data = {
            "status": "completed",
            "processingTimeMs": processing_time_ms,
            "annotatedImagePath": annotated_image_path,
            "rawImagePath": minio_raw_path if minio_raw_path else file_path,
            "createdBy": user.get('id')
        }
        await db_service.update_prediction_run(run_id, update_data)

        redis_service.log_progress(run_id, 100, f"Prediction completed successfully in {processing_time_ms}ms")

        # 7. Prepare response
        response = {
            'success': True,
            'data': {
                'run_id': run_id,
                'sample_no': sample_no,
                'submission_no': submission_no,
                'predict_at': None,
                'model_version': (model_version or Config.MODEL_VERSION),
                'status': 'completed',
                'processing_time_ms': processing_time_ms,
                'annotated_image_url': minio_annotated_path if minio_annotated_path else f"/api/v1/inference/images/{run_id}/annotated",
                'statistics': {
                    'total_detections': len([p for well in wells for p in well.get('predictions', [])]),
                    'wells_analyzed': len(wells),
                    'average_confidence': sum(p['confidence'] for well in wells for p in well.get('predictions', [])) / max(1, len([p for well in wells for p in well.get('predictions', [])]))
                },
                'well_predictions': well_predictions,
                'row_counts': counts,
                'inference_results': {
                    'distribution': distribution
                }
            }
        }
        logger.info("Prediction endpoint completed successfully for run_id=%s", run_id)
        return JSONResponse(status_code=200, content=response)

    except Exception as e:
        logger.exception("Error during prediction for run_id=%s: %s", run_id, e)
        
        # Log error to Redis
        redis_service.log_error(run_id, "PREDICTION_ERROR", str(e), {
            'sample_no': sample_no,
            'submission_no': submission_no,
            'error_type': type(e).__name__
        })
        
        # Update run status to failed via prediction-db-service
        try:
            update_data = {
                "status": "failed",
                "errorMsg": str(e),
                "processingTimeMs": int((time.time() - start_time) * 1000)
            }
            await db_service.update_prediction_run(run_id, update_data)
        except Exception as update_error:
            logger.error(f"Failed to update run status to failed: {update_error}")
        
        raise HTTPException(status_code=500, detail={
            'success': False,
            'error': {
                'code': 'INFERENCE_FAILED',
                'message': 'Model inference failed',
                'details': {
                    'run_id': run_id,
                    'error_type': type(e).__name__,
                    'error_details': str(e)
                }
            }
        })

@router.get("/models")
async def get_models(user: Dict[str, Any] = Depends(verify_token)):
    """Get available model versions and their status"""
    try:
        # Check if model file exists
        model_path = getattr(Config, 'MODEL_PATH', None)
        model_exists = os.path.exists(model_path) if model_path else False
        
        models = {
            "available_models": [
                {
                    "version": Config.MODEL_VERSION,
                    "path": model_path,
                    "status": "available" if model_exists else "not_found",
                    "confidence_threshold": Config.CONFIDENCE_THRESHOLD,
                    "nms_threshold": Config.NMS_THRESHOLD
                }
            ],
            "default_version": Config.MODEL_VERSION,
            "gpu_enabled": Config.ENABLE_GPU
        }
        
        return JSONResponse(status_code=200, content={
            "success": True,
            "data": models
        })
    except Exception as e:
        logger.error(f"Error getting models: {e}")
        raise HTTPException(status_code=500, detail="Failed to get model information")

@router.get("/status/{run_id}")
async def get_status(run_id: int, user: Dict[str, Any] = Depends(verify_token)):
    """Get the status of an inference run"""
    try:
        # Get run data from prediction-db-service
        run_data = await db_service.get_prediction_run(run_id)
        
        # Get progress from Redis
        progress_data = redis_service.get_progress(run_id)
        
        # Get error from Redis if any
        error_data = redis_service.get_error(run_id)
        
        response = {
            "success": True,
            "data": {
                "run_id": run_id,
                "status": (run_data.get("run") or run_data.get("data", {})).get("status"),
                "progress": progress_data,
                "error": error_data,
                "created_at": (run_data.get("run") or run_data.get("data", {})).get("createdAt"),
                "updated_at": (run_data.get("run") or run_data.get("data", {})).get("updatedAt")
            }
        }
        
        return JSONResponse(status_code=200, content=response)
    except Exception as e:
        logger.error(f"Error getting status for run {run_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to get run status")

@router.get("/images/{run_id}/annotated")
async def get_annotated_image(run_id: int, user: Dict[str, Any] = Depends(verify_token)):
    """Serve the annotated image file"""
    try:
        # Get run data from prediction-db-service
        run_data = await db_service.get_prediction_run(run_id)
        run_obj = (run_data.get("run") or run_data.get("data", {}))
        annotated_path = run_obj.get("annotatedImagePath")
        
        if not annotated_path or not os.path.exists(annotated_path):
            raise HTTPException(status_code=404, detail="Annotated image not found")
        
        from fastapi.responses import FileResponse
        return FileResponse(annotated_path, media_type="image/jpeg")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error serving annotated image for run {run_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to serve annotated image")

@router.get("/health")
async def health_check():
    """Detailed health check for Redis and database service"""
    try:
        # Check Redis connection
        redis_healthy = redis_service.is_connected()
        
        # Check prediction-db-service
        db_health = await db_service.health_check()
        db_healthy = db_health.get("status") == "healthy"
        
        overall_status = "healthy" if redis_healthy and db_healthy else "unhealthy"
        
        return JSONResponse(status_code=200, content={
            "success": True,
            "data": {
                "status": overall_status,
                "timestamp": time.time(),
                "services": {
                    "redis": {
                        "status": "healthy" if redis_healthy else "unhealthy",
                        "connected": redis_healthy
                    },
                    "prediction_db_service": {
                        "status": db_health.get("status", "unknown"),
                        "healthy": db_healthy,
                        "details": db_health
                    }
                }
            }
        })
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return JSONResponse(status_code=503, content={
            "success": False,
            "data": {
                "status": "unhealthy",
                "error": str(e)
            }
        })
