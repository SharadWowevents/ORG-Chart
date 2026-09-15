from pushbullet import Pushbullet
import requests
import json
import time

# 1. Connect to Pushbullet
PB_TOKEN = "o.UUS947lsmzcjjE0ccH2Pftpab6wjLz2B"
pb = Pushbullet(PB_TOKEN)
phone = pb.devices[0] 

# 2. Use the new dedicated Texts API endpoint
url = "https://api.pushbullet.com/v2/texts"
headers = {
    "Access-Token": PB_TOKEN,
    "Content-Type": "application/json"
}

# 3. Build the payload using the new required structure
payload = {
    "data": {
        "target_device_iden": phone.device_iden,
        "addresses": ["+918630740617"],         # Must be a list now
        "message": "Pick up the call!",
        "guid": str(time.time())                # API requires a unique ID per message
    }
}

# 4. Send the request

while True:
    response = requests.post(url, headers=headers, data=json.dumps(payload))
    if response.status_code == 200:
        print("Message sent successfully!")
    else:
        print(f"Failed to send message. Status code: {response.status_code}, Response: {response.text}")
    time.sleep(10)  # Wait for 10 seconds before sending the next message