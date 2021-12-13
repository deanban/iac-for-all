IAC with @pulumi/aws-typescript

1. Make sure you are in pulumi folder in your terminal.
2. Inside `Pulumi.dev.yaml` file, update `AWS_PROFILE=` with the profile you'd like to use.
3. Run `npm run bootstrap`.
4. Run `npm run preview`.
5. If asked for secret (it shouldn't), enter my favorite password `abc`.
6. Assuming the preview is successful, run `npm run up`.
7. You can destroy all created resources with `npm run destroy`.


