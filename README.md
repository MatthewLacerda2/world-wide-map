# world-wide-map

[Website](https://matthewlacerda2.github.io/world-wide-map)
An internet topology system

I tracerouted to a bunch of targets to map the internet's topology.

# How this works

- Traceroute
- Store the IP addresses and their ping times
- Throw those IPs in a geolocator api
- Display in a map

I ommited >6000km hops
I was told to use UDP as well as ICMP. It gives the final destination more consistenly, but misses way more hops.
I didn't get marked as bad request by any ISP or router.

# How to run

```
cd traceroute-app
python3 unix.py
python3 ip-geoloc.py
```

unix.py reads from targets.json, which is a list of urls to traceroute to
The more geographically disperse those targets are, the better. Preferably, they are not Anycasted.
Targets in the same location can still be useful, due to load-balancers screwing us up, momentary outtages, and paris-traceroute is not implemented.

# What did i learn

## TLDR

You get +20ms ping, for every 1000km in land-based routes
You get +09ms ping, for every 1000km in submarine-cable routes
_I actually knew it from playing online, i was competitive..._

Knowing Protocols is great. Knowing routes is pointless, you're not gonna define 'em
That's how you vibe-code your way.

## Post:

My initial idea was to run this in Google Cloud Function, one for each region, and send it to an api in Cloud Run (serverless). Said api would be open to the public, for sending traceroute results and seeing the data

- Turns out Spot Instances are better
- They are idle VMs that Google rents for cheap
- Better `for cheap` than not not renting at all
- They just give a preemptive warning `i'll shut you down in 30 seconds`
- Fine for my case, i'd pick up where i left off

Running this on the Cloud would've given more data. Not much more benefit other than maybe practice. Would've been cheap, tho
Hence why there is a 'server' folder with an ExpressJS api. A sketch of the original idea.

_But! There are so many rabbit-holes..._

- Some packets are load-balanced
  - Happens with most packets, can be ephemeral as a 1 second difference!
- Some routers don't show up in traceroute. Period. They don' wanna.
  - That's ommited information
  - Shows up in the map as just a huge line from New York to Japan
    - Or no line at all, if you code for that
- Cloud Providers have their own topology
  - Not visible to the public
  - Minimal hops
  - It messes with the map's intent
- There are million ways packets are sent
  - A ship in the Pacific will use Starlink to get that sweet sweet 24/7 internet
  - The IP can show up as SpaceX HQ, the ship's owner, whoever Starlink beams down to
    - One thing is for sure: it won't show up as on top of the Mariana trench
    - It's up to Starlink to decide, it's dynamic, and not up for subscriber to decide
    - But it will show up `Origin: California. Destination: Moscow. Ping:25`

The map serves for internet topology, not route map
By tracing to geographically dispersed targets, i can map the whole public web

## And if i can do it by myself, i'll save it to a .json file and let my github-pages website read from it
Hence why i started to get deminishing returns. A package going to Moscow maybe simply take half the route of a package going to Italy, no new data there.

That's where gist.github.com comes in, since Google Drive gives you CORS

And i learned almost all that in 24 hours, with Claude, Grok and vibe-coding.
Sure AI isn't trustworthy for production, but you shouldn't neglect it for learning.
[Here's a video](https://www.youtube.com/watch?v=LCEmiRjPEtQ) with Andrej Karpathy about it. He is a very reasonable guy.

Not to mention the targets.json, and the throwaway scripts i did to normalize the results.json as i learned

_Casting_

There is a thing called BGP, which is just routers saying "Trust me, gimme your package"
And a thing called BGP hijacking, which is when China says "Trust me, gimme your package"

And there are three things called:
Unicasting: it's when you have one server and only he is the package destination
Anycasting: it's when you have many servers and you tell BGP `send to whoever is closest`
Multicasting: it's when you have many servers and you tell BGP _CALL THEM 'ALL_

- Use that to stream your game or if you work at the stock exchange

_Caveat_: Transatlantic cables

They shown up in the map as straight lines starting in coastline cities and cutting a whole continent

- I'd have to manually write down their lines for visualization
- Then code my app `hey, if the packet goes from Y to Z, that means it's on this 11.000km cable`
- Or maybe that's Starlink again

Maybe this project can show all these rabbit-holes later, if that's possible, idgaf
