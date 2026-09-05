from pydantic import BaseModel


class AudioReceivedResponse(BaseModel):
    received: bool
    filename: str
    content_type: str
    size_bytes: int
