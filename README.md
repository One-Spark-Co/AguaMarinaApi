# AguaMarinaApi

curl -X POST "https://api.airtable.com/v0/bases/apps2O97MnvSPpbeX/webhooks" \
-H "Authorization: Bearer YOUR_TOKEN" \
-H "Content-Type: application/json" \
--data '{
    "notificationUrl": "https://foo.com/receive-ping",
    "specification": {
      "options": {
        "filters": {
          "dataTypes": [
            "tableData"
          ],
          "recordChangeScope": "tbltp8DGLhqbUmjK1"
        }
      }
    }
  }'

  aguaMarinaPersonalToken = pat6klix0WZZYtA55.fc6a3b2972c9c0b9044c2b5dbe2134e72b000c5710b664bad3446913fb36d4ad