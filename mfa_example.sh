#!/bin/bash

AWS_CLI=`which aws`

if [ $? -ne 0 ]; then
  echo "AWS CLI is not installed; exiting"
  exit 1
else
  echo "Using AWS CLI found at $AWS_CLI"
fi

AWS_PROFILE=
AWS_MFA_PROFILE=
MFA_DEVICE_ARN=
DURATION=129600

echo "AWS Profile: $AWS_PROFILE"
echo "MFA ARN: $MFA_DEVICE_ARN"

# Prompt for MFA
echo "Enter MFA Code:"
read MFA_TOKEN_CODE

read AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY AWS_SESSION_TOKEN <<< \
$( aws --profile $AWS_PROFILE sts get-session-token \
  --duration $DURATION  \
  --serial-number $MFA_DEVICE_ARN \
  --token-code $MFA_TOKEN_CODE \
  --output text  | awk '{ print $2, $4, $5 }')
echo "AWS_ACCESS_KEY_ID: " $AWS_ACCESS_KEY_ID
echo "AWS_SECRET_ACCESS_KEY: " $AWS_SECRET_ACCESS_KEY
echo "AWS_SESSION_TOKEN: " $AWS_SESSION_TOKEN
if [ -z "$AWS_ACCESS_KEY_ID" ]
then
  exit 1
fi
`aws --profile $AWS_MFA_PROFILE configure set aws_access_key_id "$AWS_ACCESS_KEY_ID"`
`aws --profile $AWS_MFA_PROFILE configure set aws_secret_access_key "$AWS_SECRET_ACCESS_KEY"`
`aws --profile $AWS_MFA_PROFILE configure set aws_session_token "$AWS_SESSION_TOKEN"`
