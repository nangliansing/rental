# Search Agent Profiles

Search public agent profiles by display name autocomplete.

Authentication is optional at the route level, but this endpoint does not use viewer-specific data.

## Endpoint

```http
GET /api/v1/search/agents
```

Full local URL:

```http
GET http://localhost:3000/api/v1/search/agents?query=Patch&limit=10
```

## Headers

Optional:

```http
Authorization: Bearer ACCESS_TOKEN
```

## Query Params

```txt
query  required, 2 to 80 characters
limit  optional, default 20, range 1 to 100
```

Example:

```http
GET http://localhost:3000/api/v1/search/agents?query=Patch&limit=10
```

## Atlas Search Index

This endpoint uses Atlas Search, not a normal MongoDB index.

Required collection:

```txt
agent_profiles
```

Required index name:

```txt
agent_profile_display_name_autocomplete
```

Index definition:

```json
{
  "mappings": {
    "dynamic": false,
    "fields": {
      "displayName": [
        {
          "type": "autocomplete",
          "tokenization": "edgeGram",
          "minGrams": 2,
          "maxGrams": 20,
          "foldDiacritics": true
        }
      ],
      "isDeleted": {
        "type": "boolean"
      }
    }
  }
}
```

## Public Visibility Rules

Profiles are returned only when:

- agent profile is not deleted
- linked owner user exists
- linked owner user status is `ACTIVE`

Hidden from response:

- `userId`
- contact fields: `phone`, `lineUrl`, `whatsappPhone`, `telegramUrl`, `viberPhone`
- delete fields
- admin verification fields: `verifiedBy`, `verifiedAt`

Display-only fields:

- `isOnline` does not hide the profile.
- `isVerified` does not hide the profile.

Public trust fields:

- `reviewSummary` is included.

## Success Output

Status:

```http
200 OK
```

Body:

```json
{
  "success": true,
  "data": [
    {
      "_id": "6a5669f81a9630e315e059a7",
      "displayName": "Patch Restored Agent",
      "profilePhoto": null,
      "description": null,
      "supportLanguages": ["English", "Thai"],
      "isVerified": false,
      "reviewSummary": {
        "averageRating": 0,
        "reviewCount": 0,
        "ratingCounts": {
          "oneStar": 0,
          "twoStars": 0,
          "threeStars": 0,
          "fourStars": 0,
          "fiveStars": 0
        },
        "tagCounts": []
      },
      "createdAt": "2026-07-14T16:55:20.273Z",
      "updatedAt": "2026-07-17T17:55:59.798Z",
      "isOnline": true
    }
  ]
}
```

## Empty Result

No matching public agent profile:

```json
{
  "success": true,
  "data": []
}
```

## Validation Errors

Missing `query`:

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "query is required"
}
```

Short `query`:

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "query must be at least 2 characters"
}
```

Long `query`:

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "query must be at most 80 characters"
}
```

Invalid `limit` format:

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "limit must be a number"
}
```

Invalid `limit` range:

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "limit must be between 1 and 100"
}
```

## Tested Checklist

- `200` success search
- `reviewSummary` is included
- `userId` is hidden
- contact fields are hidden
- query too short
- missing query
- query too long
- limit too high
- limit below 1
- invalid limit format
- no matching results returns empty array
- deleted agent profile is hidden
- suspended owner user is hidden
- inactive owner user is hidden
- `isOnline: false` still returns profile
- `isVerified: true` still returns profile
- final restored baseline returns expected profile
