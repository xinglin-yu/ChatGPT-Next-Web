# 1. How to local develop

## 1). Clone code from github
```
git clone xxx
git checkout -b user_name/branch_name origin/hackathon2023
```

## 2). Install nodejs and yarn
```shell
npm install --global yarn
yarn --version
node -v
```

## 3). Set up local develop environment
Create a new `.env.local` file at project root, and place your api key into it:
```shell
OPENAI_API_KEY=<your api key here>
SpeechSubscriptionKey=<your azure speech subscription key here>
SpeechSubscriptionRegion=<your azure speech subscription region here>
BackendServiceUrl=<Backend Service Url>
```
you can refer the `env.template` to set other env variables.

## 4). Run
From `Terminal -> New Terminal`, to open terminal window, 

and click `+`, to add a `JavaScript Debug Terminal` window, run command: 
```shell
yarn install
yarn dev
```

you should see portal in pop-up brower page.
