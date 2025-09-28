"""
Development runner for Vision Capture Service
"""

import os
import sys
import asyncio
from pathlib import Path

# Add project root to Python path
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

# Ensure logs directory exists
logs_dir = project_root / "logs"
logs_dir.mkdir(exist_ok=True)

# Ensure captures directory exists
captures_dir = project_root / "captures"
captures_dir.mkdir(exist_ok=True)

if __name__ == "__main__":
    import uvicorn
    from app.core.config import settings
    
    print("🚀 Starting Vision Capture Service in development mode...")
    print(f"📁 Project root: {project_root}")
    print(f"📊 Logs directory: {logs_dir}")
    print(f"📸 Captures directory: {captures_dir}")
    print(f"🌐 Server: http://{settings.HOST}:{settings.PORT}")
    print(f"📚 API Docs: http://{settings.HOST}:{settings.PORT}/docs")
    print("-" * 50)
    
    # Run the application
    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=True,
        log_level="info",
        access_log=True
    )
