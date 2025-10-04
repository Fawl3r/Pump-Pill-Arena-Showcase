# 📡 API Documentation

## Overview

The Pump Pill Arena API provides a comprehensive RESTful interface for managing trading leaderboards, user rewards, and blockchain interactions. All endpoints are designed with type safety, comprehensive validation, and detailed error handling.

## Base URL

```
Development: http://localhost:4000/api
Production: https://api.pumppillarena.com/api
```

## Authentication

### JWT Token Authentication

Most endpoints require authentication using JWT tokens. Include the token in the Authorization header:

```http
Authorization: Bearer <your-jwt-token>
```

### Wallet Authentication

For blockchain-related operations, users authenticate by signing messages with their Solana wallet:

```typescript
// Frontend wallet authentication
const message = "Sign this message to authenticate with Pump Pill Arena";
const signature = await wallet.signMessage(new TextEncoder().encode(message));
```

## Response Format

All API responses follow a consistent format:

### Success Response
```json
{
  "data": { ... },
  "pagination": { ... }, // Optional, for paginated endpoints
  "metadata": { ... }    // Optional, for additional context
}
```

### Error Response
```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": { ... } // Optional, for validation errors
}
```

## Status Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 429 | Too Many Requests |
| 500 | Internal Server Error |

## Rate Limiting

API requests are rate limited to prevent abuse:

- **Authenticated Users**: 1000 requests per hour
- **Unauthenticated Users**: 100 requests per hour
- **Admin Users**: 5000 requests per hour

Rate limit headers are included in responses:
```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1640995200
```

---

## Endpoints

### Leaderboard

#### GET /leaderboard

Retrieves paginated leaderboard data with optional filtering and sorting.

**Query Parameters:**
- `page` (number, optional): Page number (default: 1)
- `pageSize` (number, optional): Items per page (default: 50, max: 100)
- `epoch` (number, optional): Filter by specific epoch
- `sortBy` (string, optional): Sort field (`volume`, `rank`, `rewards`)
- `order` (string, optional): Sort order (`asc`, `desc`)

**Example Request:**
```http
GET /api/leaderboard?page=1&pageSize=20&sortBy=volume&order=desc
```

**Example Response:**
```json
{
  "data": [
    {
      "rank": 1,
      "wallet": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
      "volToken": 1500000,
      "volSol": 25.5,
      "volUsd": 2550.00,
      "rewardLamports": "1000000000",
      "trades": 45,
      "winRate": 0.78
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 150,
    "totalPages": 8
  },
  "metadata": {
    "epoch": 1,
    "lastUpdated": "2024-01-15T10:30:00Z",
    "totalVolume": 1250.75,
    "totalRewards": "5000000000"
  }
}
```

#### GET /leaderboard/stats

Retrieves aggregate statistics for the leaderboard.

**Example Response:**
```json
{
  "totalParticipants": 150,
  "totalVolume": 1250.75,
  "totalRewards": "5000000000",
  "averageVolume": 8.34,
  "topPerformer": {
    "wallet": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
    "volume": 25.5,
    "rewards": "1000000000"
  },
  "lastUpdated": "2024-01-15T10:30:00Z"
}
```

### User Management

#### GET /user/profile

Retrieves user profile information.

**Headers:**
```http
Authorization: Bearer <jwt-token>
```

**Example Response:**
```json
{
  "data": {
    "id": "user-uuid",
    "wallet": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
    "nickname": "TraderPro",
    "totalVolume": 125.5,
    "totalRewards": "500000000",
    "rank": 15,
    "trades": 45,
    "winRate": 0.72,
    "joinedAt": "2024-01-01T00:00:00Z"
  }
}
```

#### PUT /user/profile

Updates user profile information.

**Headers:**
```http
Authorization: Bearer <jwt-token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "nickname": "NewNickname"
}
```

**Example Response:**
```json
{
  "data": {
    "id": "user-uuid",
    "wallet": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
    "nickname": "NewNickname",
    "updatedAt": "2024-01-15T10:30:00Z"
  }
}
```

### Rewards

#### GET /rewards/pending

Retrieves pending rewards for the authenticated user.

**Headers:**
```http
Authorization: Bearer <jwt-token>
```

**Example Response:**
```json
{
  "data": {
    "pendingRewards": "250000000",
    "pendingSol": "0.25",
    "epoch": 1,
    "canClaim": true,
    "lastClaimed": "2024-01-14T10:30:00Z"
  }
}
```

#### POST /rewards/claim

Claims pending rewards for the authenticated user.

**Headers:**
```http
Authorization: Bearer <jwt-token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "walletAddress": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
  "signature": "wallet-signature"
}
```

**Example Response:**
```json
{
  "data": {
    "transactionSignature": "5J7X...",
    "amount": "250000000",
    "status": "pending",
    "estimatedConfirmation": "2024-01-15T10:35:00Z"
  }
}
```

#### GET /rewards/history

Retrieves reward claim history for the authenticated user.

**Headers:**
```http
Authorization: Bearer <jwt-token>
```

**Query Parameters:**
- `page` (number, optional): Page number (default: 1)
- `pageSize` (number, optional): Items per page (default: 20)

**Example Response:**
```json
{
  "data": [
    {
      "id": "reward-uuid",
      "amount": "250000000",
      "epoch": 1,
      "transactionSignature": "5J7X...",
      "claimedAt": "2024-01-14T10:30:00Z",
      "status": "confirmed"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 5,
    "totalPages": 1
  }
}
```

### Trading Data

#### GET /trades

Retrieves trading history for the authenticated user.

**Headers:**
```http
Authorization: Bearer <jwt-token>
```

**Query Parameters:**
- `page` (number, optional): Page number (default: 1)
- `pageSize` (number, optional): Items per page (default: 50)
- `token` (string, optional): Filter by token address
- `side` (string, optional): Filter by trade side (`buy`, `sell`)

**Example Response:**
```json
{
  "data": [
    {
      "id": "trade-uuid",
      "tokenAddress": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
      "side": "buy",
      "amount": 100.5,
      "price": 0.025,
      "value": 2.5125,
      "timestamp": "2024-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 50,
    "total": 150,
    "totalPages": 3
  }
}
```

### Admin Endpoints

#### GET /admin/analytics

Retrieves platform analytics (admin only).

**Headers:**
```http
Authorization: Bearer <admin-jwt-token>
```

**Example Response:**
```json
{
  "data": {
    "totalUsers": 1250,
    "totalVolume": 12500.75,
    "totalRewards": "50000000000",
    "activeUsers": 850,
    "newUsersToday": 25,
    "topTokens": [
      {
        "address": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
        "volume": 2500.5,
        "trades": 150
      }
    ]
  }
}
```

#### POST /admin/epoch/start

Starts a new reward epoch (admin only).

**Headers:**
```http
Authorization: Bearer <admin-jwt-token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "startTs": 1640995200,
  "endTs": 1641081600,
  "index": 2
}
```

**Example Response:**
```json
{
  "data": {
    "epochId": 2,
    "startTs": 1640995200,
    "endTs": 1641081600,
    "status": "active"
  }
}
```

---

## Error Codes

### Validation Errors (400)
- `VALIDATION_ERROR`: Invalid request parameters
- `INVALID_PAGE_SIZE`: Page size exceeds maximum limit
- `INVALID_SORT_FIELD`: Invalid sort field specified
- `INVALID_ORDER`: Invalid sort order specified

### Authentication Errors (401)
- `INVALID_TOKEN`: Invalid or expired JWT token
- `MISSING_TOKEN`: Authorization header missing
- `INVALID_SIGNATURE`: Invalid wallet signature

### Authorization Errors (403)
- `INSUFFICIENT_PERMISSIONS`: User lacks required permissions
- `ADMIN_REQUIRED`: Admin access required

### Not Found Errors (404)
- `USER_NOT_FOUND`: User not found
- `REWARD_NOT_FOUND`: Reward not found
- `EPOCH_NOT_FOUND`: Epoch not found

### Rate Limiting Errors (429)
- `RATE_LIMIT_EXCEEDED`: Too many requests

### Server Errors (500)
- `INTERNAL_ERROR`: Internal server error
- `DATABASE_ERROR`: Database operation failed
- `BLOCKCHAIN_ERROR`: Blockchain operation failed

---

## WebSocket Events

### Real-time Updates

Connect to WebSocket for real-time updates:

```javascript
const ws = new WebSocket('wss://api.pumppillarena.com/ws');

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Received:', data);
};
```

### Event Types

#### leaderboard.update
```json
{
  "type": "leaderboard.update",
  "data": {
    "rank": 1,
    "wallet": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
    "volume": 25.5,
    "change": "+2.5"
  }
}
```

#### reward.available
```json
{
  "type": "reward.available",
  "data": {
    "amount": "250000000",
    "epoch": 1
  }
}
```

#### trade.executed
```json
{
  "type": "trade.executed",
  "data": {
    "wallet": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
    "token": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    "side": "buy",
    "amount": 100.5,
    "value": 2.5125
  }
}
```

---

## SDK Examples

### JavaScript/TypeScript

```typescript
import { PumpPillArenaAPI } from '@pumppillarena/sdk';

const api = new PumpPillArenaAPI({
  baseURL: 'https://api.pumppillarena.com/api',
  apiKey: 'your-api-key'
});

// Get leaderboard
const leaderboard = await api.leaderboard.get({
  page: 1,
  pageSize: 20,
  sortBy: 'volume',
  order: 'desc'
});

// Claim rewards
const claim = await api.rewards.claim({
  walletAddress: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
  signature: 'wallet-signature'
});
```

### Python

```python
import requests

class PumpPillArenaAPI:
    def __init__(self, base_url, api_key):
        self.base_url = base_url
        self.headers = {'Authorization': f'Bearer {api_key}'}
    
    def get_leaderboard(self, page=1, page_size=50):
        response = requests.get(
            f'{self.base_url}/leaderboard',
            params={'page': page, 'pageSize': page_size},
            headers=self.headers
        )
        return response.json()

api = PumpPillArenaAPI('https://api.pumppillarena.com/api', 'your-api-key')
leaderboard = api.get_leaderboard()
```

---

*This API documentation provides comprehensive information for integrating with the Pump Pill Arena platform.*
