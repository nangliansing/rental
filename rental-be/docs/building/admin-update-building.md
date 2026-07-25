# Admin Update Building

> **Status: dormant and disabled.** Building changes should currently use the building edit
> request workflow. See
> [Unused Admin Endpoint Registry](../unused-admin-endpoints.md) before
> restoring or exposing this direct update.

## Endpoint

PATCH /api/v1/admin/buildings/:buildingId

## Auth

Requires OWNER or ADMIN access token.

## Headers

Authorization: Bearer <ACCESS_TOKEN>
Content-Type: application/json

## Example

PATCH /api/v1/admin/buildings/6a438cddd2b8c5e98da4deab

## Request Body

```json
{
  "name": "Bangkapi Residence",
  "buildingType": "Apartment",
  "isActive": true,
  "facilities": ["Parking", "Wifi", "Laundry"],
  "security": ["CCTV", "Access Control"],
  "address": "Bangkapi, Bangkok",
  "location": {
    "type": "Point",
    "coordinates": [100.643, 13.765]
  },
  "reason": "Full admin correction after verification"
}
```

## Success Response

Status: 200

```json
{
  "success": true,
  "data": {
    "_id": "6a438cddd2b8c5e98da4deab",
    "name": "Bangkapi Residence",
    "isActive": true,
    "buildingType": "Apartment",
    "facilities": ["Parking", "Wifi", "Laundry"],
    "security": ["CCTV", "Access Control"],
    "address": "Bangkapi, Bangkok",
    "location": {
      "type": "Point",
      "coordinates": [100.643, 13.765]
    }
  }
}
```

## Validation Examples

### Missing Reason

```json
{
  "name": "No Reason Building"
}
```

Expected: 422

```json
{
  "success": false,
  "code": "VALIDATION_ERROR"
}
```

### Invalid Building Type

```json
{
  "buildingType": "Hotel",
  "reason": "Testing invalid building type"
}
```

Expected: 422

### Invalid Coordinates

```json
{
  "location": {
    "type": "Point",
    "coordinates": [200, 13.765]
  },
  "reason": "Testing invalid longitude"
}
```

Expected: 422

### Building Not Found

PATCH /api/v1/admin/buildings/64aaaaaaaaaaaaaaaaaaaaaa

```json
{
  "name": "Not Existing",
  "reason": "Testing not found"
}
```

Expected: 404

```json
{
  "success": false,
  "code": "BUILDING_NOT_FOUND"
}
```
