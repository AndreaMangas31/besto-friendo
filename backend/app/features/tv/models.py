from typing import List

from pydantic import BaseModel


class TvActionResult(BaseModel):
    ok: bool
    message: str


class TvCastDevice(BaseModel):
    name: str
    model: str = ""
    host: str = ""


class TvCastList(BaseModel):
    devices: List[TvCastDevice]
    wanted: str
    message: str
