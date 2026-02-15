from fastapi import FastAPI, Depends, HTTPException
from sqlmodel import Session, select
from typing import List, Optional
from database import engine, HopResult, TargetStatus, get_session, create_db_and_tables
import time

app = FastAPI(title="World Wide Map API")

@app.on_event("startup")
def on_startup():
    create_db_and_tables()

@app.post("/results")
def store_result(results: List[HopResult], session: Session = Depends(get_session)):
    for result in results:
        session.add(result)
    session.commit()
    return {"status": "success", "count": len(results)}

@app.get("/results", response_model=List[HopResult])
def get_results(session: Session = Depends(get_session)):
    results = session.exec(select(HopResult)).all()
    return results

@app.get("/targets/next", response_model=Optional[str])
def get_next_target(region: str, session: Session = Depends(get_session)):
    # Find a pending target for this region
    target_entry = session.exec(
        select(TargetStatus)
        .where(TargetStatus.region == region)
        .where(TargetStatus.status == "pending")
        .limit(1)
    ).first()
    
    if target_entry:
        target_entry.status = "in-progress"
        target_entry.last_updated = time.time()
        session.add(target_entry)
        session.commit()
        return target_entry.target
    
    return None

@app.post("/targets/complete")
def complete_target(region: str, target: str, session: Session = Depends(get_session)):
    target_entry = session.exec(
        select(TargetStatus)
        .where(TargetStatus.region == region)
        .where(TargetStatus.target == target)
    ).first()
    
    if target_entry:
        target_entry.status = "completed"
        target_entry.last_updated = time.time()
        session.add(target_entry)
        session.commit()
        return {"status": "success"}
    
    raise HTTPException(status_code=404, detail="Target not found")

@app.post("/targets/initialize")
def initialize_targets(session: Session = Depends(get_session)):
    """Seed the database with targets from targets.py and default regions."""
    from targets import TARGETS

    north_america = [
        "us-central1", "us-east1", "us-east4", "us-east5", 
        "us-west1", "us-west2", "us-west3", "us-west4", 
        "us-south1", "northamerica-northeast1", "northamerica-northeast2"
    ]
    south_america = [
        "southamerica-east1", "southamerica-west1"
    ]
    europe = [
        "europe-west1", "europe-west2", "europe-west3", "europe-west4", 
        "europe-west6", "europe-west8", "europe-west9", "europe-west10", 
        "europe-west12", "europe-north1", "europe-north2", 
        "europe-central2", "europe-southwest1"
    ]
    asia = [
        "asia-east1", "asia-east2", "asia-northeast1", "asia-northeast2", 
        "asia-northeast3", "asia-south1", "asia-south2", 
        "asia-southeast1", "asia-southeast2", "asia-southeast3"
    ]
    australia = [
        "australia-southeast1", "australia-southeast2"
    ]
    middle_east_africa = [
        "me-central1", "me-central2", "me-west1", "africa-south1"
    ]
    
    regions = north_america + south_america + europe + asia + australia + middle_east_africa
    
    for region in regions:
        for target in TARGETS:
            exists = session.exec(
                select(TargetStatus)
                .where(TargetStatus.region == region)
                .where(TargetStatus.target == target)
            ).first()
            if not exists:
                session.add(TargetStatus(target=target, region=region, status="pending"))
    session.commit()
    return {"status": "success", "regions": regions, "targets_count": len(TARGETS)}
