import { AwsClient, AwsV4Signer } from "aws4fetch"

// R2 in prod, RustFS in local dev (compose.yaml); both speak the S3 API
export function s3(env: Env) {
	const creds = {
		accessKeyId: env.S3_ACCESS_KEY_ID,
		secretAccessKey: env.S3_SECRET_ACCESS_KEY,
		service: "s3",
		region: "auto",
	}
	const client = new AwsClient(creds)
	const url = (key: string) => `${env.S3_ENDPOINT}/${env.S3_BUCKET}/${key}`
	return {
		// signs content-type and content-length, so the browser can only PUT exactly what it declared
		async presignPut(key: string, type: string, size: number) {
			const signer = new AwsV4Signer({
				...creds,
				url: `${url(key)}?X-Amz-Expires=600`,
				method: "PUT",
				headers: { "content-type": type, "content-length": String(size) },
				signQuery: true,
				allHeaders: true,
			})
			return (await signer.sign()).url.toString()
		},
		head: (key: string) => client.fetch(url(key), { method: "HEAD" }),
		delete: (key: string) => client.fetch(url(key), { method: "DELETE" }),
	}
}

export const fileKeys = (id: string, version: string) => ({
	pdf: `${id}/${version}/portfolio.pdf`,
	cover: `${id}/${version}/cover`, // webp, or jpeg from Safari; R2 serves the stored content-type
})
