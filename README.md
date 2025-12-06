# world-wide-map

A crowdsourced internet topology

People can run a `traceroute-app` to help trace the internet's map, then send the results to be processed and then made public
The server will run the IPs from the traceroute into an ip geolocator

# How to run

```
cd traceroute-app
python -m venv venv
pip install -r requirements.txt
python app.py
```

# Infra

- We got a list of URLs to traceroute to
- The user runs the app that traceroutes from their machine
  - The app extracts the IPs from the traceroute, along with the response time
  - The app sends each traceroute's result to the main server via POST request
- The request goes to Cloudflare which simply Tunnels it to the server (i ain't got a static IP, yo)
- I receive the results and run them via ip-api.com, and then save everything to a supabase db

There is a React project to github pages so people can nicely visualize stuff

The supabase db is public read
