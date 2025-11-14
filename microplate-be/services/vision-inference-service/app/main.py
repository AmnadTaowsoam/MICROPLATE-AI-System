import os
import logging

from fastapi import FastAPI

from app.api.v1.endpoints import router as api_router
from app.config import Config
from app.logging_config import configure_logging

configure_logging(Config.LOG_LEVEL)
logger = logging.getLogger("vision-inference-service")

app = FastAPI()


# Health Check Endpoint
@app.get("/health", tags=["Health Check"])
async def health_check():
    logger.debug("Health check endpoint called.")
    return {"status": "healthy"}


# Route Registration
app.include_router(api_router, prefix="/api/v1/inference")


# Main entry point for development
if __name__ == "__main__":
    import uvicorn

    HOST = os.getenv("HOST", "0.0.0.0")
    PORT = Config.PORT
    logger.info("Starting server", extra={"host": HOST, "port": PORT})
    uvicorn.run("app.main:app", host=HOST, port=PORT, reload=True, workers=2)
