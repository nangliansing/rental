# Admin Create Building

> **Status: dormant and disabled.** This endpoint is not part of the intended product flow.
> See [Unused Admin Endpoint Registry](../unused-admin-endpoints.md) before
> restoring or exposing it.

Create a verified building directly by platform owner/admin.

## Endpoint

```http
POST /api/v1/admin/buildings
```

## Headers

```http
Authorization: Bearer <accessToken>
Content-Type: application/json
```

## Body

```json
{
  "name": "The Park Residence",
  "buildingType": "Apartment",
  "facilities": ["Parking", "Lift", "Wifi"],
  "security": ["CCTV", "Security Guard", "Keycard Access"],
  "location": {
    "type": "Point",
    "coordinates": [100.6432, 13.7651]
  },
  "address": "Near The Mall Bangkapi, Bangkok"
}
```

## Success Response

Status:

```http
201 Created
```

Response:

```json
{
  "success": true,
  "data": {
    "_id": "BUILDING_ID",
    "name": "The Park Residence",
    "isActive": true,
    "buildingType": "Apartment",
    "facilities": ["Parking", "Lift", "Wifi"],
    "security": ["CCTV", "Security Guard", "Keycard Access"],
    "location": {
      "type": "Point",
      "coordinates": [100.6432, 13.7651]
    },
    "address": "Near The Mall Bangkapi, Bangkok",
    "minRent": null,
    "maxRent": null,
    "createdBy": "USER_ID",
    "updatedBy": null,
    "createdAt": "2026-06-30T00:00:00.000Z",
    "updatedAt": "2026-06-30T00:00:00.000Z"
  }
}
```

## Common Errors

Missing/invalid token:

```http
401 Unauthorized
```

User is not owner/admin:

```http
403 Forbidden
```

Validation error:

```http
422 Unprocessable Entity
```

Example:

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "location is required"
}
```

## Notes

- `coordinates` must be `[lng, lat]`.
- `minRent` and `maxRent` are created as `null`.
- Rent summary is updated later from listings under this building.
