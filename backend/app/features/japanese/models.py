from typing import Literal

from pydantic import BaseModel

Role = Literal["user", "assistant"]


class TutorTurn(BaseModel):
    role: Role
    text: str
