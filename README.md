# AguaMarinaApi

doctl serverless deploy .
doctl serverless watch <path to root folder>

doctl serverless functions invoke functions/setUserLiters
doctl sls functions invoke functions/setUserLiters -p orderId:"1190452696"  --no-wait
doctl sls activations result a1f7989c4428443fb7989c4428743fec