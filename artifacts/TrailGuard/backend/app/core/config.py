from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    database_url: str = "sqlite:///./trailguard.db"
    secret_key: str = "dev-secret-change-me"
    access_token_expire_minutes: int = 480
    app_name: str = "TrailGuard API"

    class Config:
        env_file = ".env"

settings = Settings()
