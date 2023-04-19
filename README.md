# AguaMarinaApi

#Must connect doctl to the correct namespace, actual: fn-0d621a5c-34a8-4785-a6b5-b76ecace58df
doctl serverless deploy .
doctl serverless watch <path to root folder>

doctl serverless functions invoke functions/setUserLiters
doctl sls functions invoke functions/setUserLiters -p id:"1190452696"  --no-wait
doctl sls functions invoke functions/getUserLiters -p id:"119601995"  --no-wait
doctl sls activations result a1f7989c4428443fb7989c4428743fec