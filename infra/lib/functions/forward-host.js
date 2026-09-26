// CloudFront はオリジン(Lambda Function URL)に対して Host ヘッダを書き換えるため、
// Next.js の Server Actions が「Origin と Host が一致しない」と判断して全リクエストを拒否する。
// 閲覧者が使っているホスト名を X-Forwarded-Host として渡し、一致させる。
function handler(event) {
  var request = event.request;
  if (request.headers.host) {
    request.headers["x-forwarded-host"] = { value: request.headers.host.value };
  }
  return request;
}
