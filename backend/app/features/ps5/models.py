from pydantic import BaseModel


class Ps5ActionResult(BaseModel):
    ok: bool
    message: str


class Ps5Status(BaseModel):
    host: str
    reachable: bool
    is_on: bool = False
    status_name: str = ""
    host_name: str = ""
    message: str
