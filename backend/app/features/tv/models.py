from typing import List

from pydantic import BaseModel, Field


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


class TvPairPin(BaseModel):
    pin: str = Field(min_length=4, max_length=8)


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
