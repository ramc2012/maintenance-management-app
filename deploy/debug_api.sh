#!/bin/bash

BASE_URL="http://localhost:3000/api"

echo "1. Logging in..."
LOGIN_RESPONSE=$(curl -X POST "$BASE_URL/auth/login"   -H "Content-Type: application/json"   -d '{"username": "admin", "password": "admin123"}')

echo "Login Response: $LOGIN_RESPONSE"

TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.token')

if [ "$TOKEN" == "null" ]; then
  echo "Login failed!"
  exit 1
fi

echo "Login successful. Token: ${TOKEN:0:10}..."

echo -e "\n2. Creating a test case..."
CASE_RESPONSE=$(curl -X POST "$BASE_URL/cases"   -H "Authorization: Bearer $TOKEN"   -H "Content-Type: application/json"   -d '{
    "title": "Debug Test Case",
    "type": "STANDARD",
    "vendor": "Test Vendor",
    "prValue": 1000,
    "currency": "USD"
  }')

echo "Case Response: $CASE_RESPONSE"

CASE_ID=$(echo $CASE_RESPONSE | jq -r '.id')

if [ "$CASE_ID" == "null" ]; then
  echo "Case creation failed!"
  exit 1
fi

echo "Case created. ID: $CASE_ID"

echo -e "\n3. Adding a comment..."
COMMENT_RESPONSE=$(curl -X POST "$BASE_URL/cases/$CASE_ID/comments"   -H "Authorization: Bearer $TOKEN"   -H "Content-Type: application/json"   -d '{
    "content": "This is a test comment",
    "effectiveDate": "2023-11-30"
  }')

echo "Comment Response: $COMMENT_RESPONSE"

echo -e "\n4. Updating stage..."
STAGE_RESPONSE=$(curl -X PUT "$BASE_URL/cases/$CASE_ID/stage"   -H "Authorization: Bearer $TOKEN"   -H "Content-Type: application/json"   -d '{
    "stage": "Approval",
    "effectiveDate": "2023-12-01"
  }')

echo "Stage Update Response: $STAGE_RESPONSE"

echo -e "\n5. Verifying case details..."
VERIFY_RESPONSE=$(curl -X GET "$BASE_URL/cases/$CASE_ID"   -H "Authorization: Bearer $TOKEN")

echo "Case Details: $VERIFY_RESPONSE"
