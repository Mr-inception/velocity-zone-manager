def run_seed(db):
    from models import User, Property, Zone

    # Only seed if no data exists
    if User.query.first():
        return

    # Create demo user
    user = User(email="demo@velocity.com")
    user.set_password("demo1234")
    db.session.add(user)
    db.session.flush()

    # Create demo property
    prop = Property(
        user_id=user.id,
        name="Bengaluru Golf Club",
        type="Golf Course",
        total_acreage=150,
        notes="Demo property pre-loaded on first boot.",
    )
    db.session.add(prop)
    db.session.flush()

    # 3 pre-drawn zones around Bengaluru area
    zones = [
        Zone(
            property_id=prop.id,
            name="Hole 1 Fairway",
            zone_type="Fairway",
            mower_count=3,
            status="Active",
            geometry={
                "type": "Polygon",
                "coordinates": [[
                    [77.5900, 12.9716],
                    [77.5920, 12.9716],
                    [77.5920, 12.9736],
                    [77.5900, 12.9736],
                    [77.5900, 12.9716],
                ]]
            }
        ),
        Zone(
            property_id=prop.id,
            name="Perimeter Fence",
            zone_type="Perimeter",
            mower_count=2,
            status="Active",
            geometry={
                "type": "Polygon",
                "coordinates": [[
                    [77.5880, 12.9700],
                    [77.5940, 12.9700],
                    [77.5940, 12.9750],
                    [77.5880, 12.9750],
                    [77.5880, 12.9700],
                ]]
            }
        ),
        Zone(
            property_id=prop.id,
            name="Rough Area North",
            zone_type="Rough",
            mower_count=1,
            status="Active",
            geometry={
                "type": "Polygon",
                "coordinates": [[
                    [77.5900, 12.9740],
                    [77.5930, 12.9740],
                    [77.5930, 12.9760],
                    [77.5900, 12.9760],
                    [77.5900, 12.9740],
                ]]
            }
        ),
    ]

    for z in zones:
        db.session.add(z)

    db.session.commit()
    print("Seed data created: Bengaluru Golf Club with 3 zones")
    print("Demo login: demo@velocity.com / demo1234")