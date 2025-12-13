# world-wide-map

A distributed internet topology system

People can run traceroute and we'll cramp the results together.
The server will extract IPs, their geolocation, and ping-times between hops.

# How to participate

Enter `traceroute-app` folder.
There is a targets.json, with a list of URLs to traceroute.
They must all be URLs, not raw IPs. That's to try to stick to more static IPs.
Run `unix.py` and let it be.
The app removes your own IP, for privacy.

You can edit targets.json.

- Reasons to add more targets:
  Contribute more info. Hopefully they're not anycasted DNSs
- Reasons to remove targets
  You're in a hurry. Life is short.

# Infra

- We got GCP Spot Instances, one in most regions, running our app
  Spots are just cheap Lambdas
- We got an api in Cloud Run taking POST requests for those traceroute results
  It'll save them to a SQL Instance

We want traceroutes as geographically distributed as possible.
The Spots are simply to get baseline data

There is a React project to github pages so people can nicely visualize stuff

# Known Issue

We're using simple traceroute, vulnerable to load-balancing and thus different results
No fix for anycasting yet
