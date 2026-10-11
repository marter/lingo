"""A kid's own session. Only ever sees that one child's data."""

from fastapi import APIRouter, Depends

from app.api.deps import get_child
from app.models.child import Child
from app.schemas.family import ChildRead

router = APIRouter(prefix="/api/child", tags=["child"])


@router.get("/me", response_model=ChildRead)
def me(child: Child = Depends(get_child)) -> Child:
    return child
