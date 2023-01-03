#!/bin/sh

cat << EOF > source/configuration-production.json
{
  "PortalPath": "${API_SCHEME}://$API_URL/",
  "ElicitLandingPath": "${API_SCHEME}://${ELICIT_LANDING_URL}/",
  "LarmPortalPath": "http://api.prod.larm.fm",
  "WayfPath": "https://wayf.larm.fm"
}
EOF
