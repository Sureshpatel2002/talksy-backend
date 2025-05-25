# User API Documentation

## Base URL
`https://talksy-backend-z1ta.onrender.com/api/users`

## Authentication
All endpoints require the user's ID to be provided in the request.

## Endpoints

### Update Contact Information
`PUT /:userId/contact`

Updates a user's contact information and personal details.

**Request Body:**
```json
{
  "phoneNumber": "+1234567890",
  "countryCode": "+1",
  "address": {
    "street": "123 Main St",
    "city": "New York",
    "state": "NY",
    "country": "USA",
    "postalCode": "10001"
  },
  "socialLinks": {
    "facebook": "https://facebook.com/username",
    "twitter": "https://twitter.com/username",
    "instagram": "https://instagram.com/username",
    "linkedin": "https://linkedin.com/in/username"
  },
  "dateOfBirth": "1990-01-01",
  "gender": "male",
  "language": "en",
  "timezone": "America/New_York"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Contact information updated successfully",
  "user": {
    "uid": "user123",
    "name": "John Doe",
    "email": "john@example.com",
    "phoneNumber": "+1234567890",
    "countryCode": "+1",
    "address": {
      "street": "123 Main St",
      "city": "New York",
      "state": "NY",
      "country": "USA",
      "postalCode": "10001"
    },
    "socialLinks": {
      "facebook": "https://facebook.com/username",
      "twitter": "https://twitter.com/username",
      "instagram": "https://instagram.com/username",
      "linkedin": "https://linkedin.com/in/username"
    },
    "dateOfBirth": "1990-01-01",
    "gender": "male",
    "language": "en",
    "timezone": "America/New_York"
  }
}
```

### Update Privacy Settings
`PUT /:userId/privacy`

Updates a user's privacy settings for contact information.

**Request Body:**
```json
{
  "showPhoneNumber": true,
  "showAddress": false,
  "showSocialLinks": true,
  "showDateOfBirth": false,
  "showGender": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "Privacy settings updated successfully",
  "privacySettings": {
    "showPhoneNumber": true,
    "showAddress": false,
    "showSocialLinks": true,
    "showDateOfBirth": false,
    "showGender": true
  }
}
```

### Get Public Profile
`GET /:userId/profile?requestingUserId=user123`

Retrieves a user's public profile. Shows more information if the requesting user is a friend.

**Response:**
```json
{
  "success": true,
  "profile": {
    "uid": "user123",
    "name": "John Doe",
    "email": "john@example.com",
    "phoneNumber": "+1234567890",
    "countryCode": "+1",
    "address": {
      "street": "123 Main St",
      "city": "New York",
      "state": "NY",
      "country": "USA",
      "postalCode": "10001"
    },
    "socialLinks": {
      "facebook": "https://facebook.com/username",
      "twitter": "https://twitter.com/username",
      "instagram": "https://instagram.com/username",
      "linkedin": "https://linkedin.com/in/username"
    },
    "dateOfBirth": "1990-01-01",
    "gender": "male",
    "language": "en",
    "timezone": "America/New_York"
  }
}
```

### Verify Phone Number
`POST /:userId/verify-phone`

Verifies a user's phone number.

**Request Body:**
```json
{
  "phoneNumber": "+1234567890",
  "verificationCode": "123456"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Phone number verified successfully"
}
```

### Search Users by Phone
`GET /search/phone?phoneNumber=1234567890&requestingUserId=user123`

Searches for users by phone number.

**Response:**
```json
{
  "success": true,
  "users": [
    {
      "uid": "user123",
      "name": "John Doe",
      "phoneNumber": "+1234567890",
      "countryCode": "+1"
    }
  ]
}
```

## Real-time Events

### User Profile Updated
When a user updates their contact information, their friends receive a real-time notification:

```javascript
socket.on('user:profile:updated', (data) => {
  const { userId, updates } = data;
  // Handle profile update
});
```

## Error Codes

- `USER_NOT_FOUND`: User with the specified ID does not exist
- `INVALID_PHONE`: Invalid phone number format
- `SERVER_ERROR`: Internal server error

## Rate Limiting

- Contact information updates: 5 requests per minute
- Phone number verification: 3 requests per minute
- Profile searches: 10 requests per minute

## Best Practices

1. Always verify phone numbers before using them
2. Respect user privacy settings when displaying contact information
3. Use the public profile endpoint to get user information
4. Handle real-time profile updates in your application
5. Implement proper error handling for all API calls 