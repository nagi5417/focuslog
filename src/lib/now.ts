/**
 * リクエスト時点の現在時刻（epoch ms）を返す。
 *
 * Server Component / Server Action から呼び、結果を props で Client へ渡す前提。
 * Date.now() の直接呼び出しをこの 1 箇所に隔離することで、
 * - Client では new Date() / Date.now() を使わない（ハイドレーション一致・JST 一貫）
 * - render 純粋性 lint（impure function during render）を呼び出し側で発生させない
 * を両立する。
 */
export function getServerNowMs(): number {
  return Date.now();
}
