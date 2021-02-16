import {defer} from 'rxjs'
import client from 'part:@sanity/base/client'

const cache = {
  secrets: null,
  exists: false,
}

export function fetchSecrets() {
  if (cache.exists) {
    return Promise.resolve(cache)
  }

  return client.fetch('*[_id == "secrets.mux"][0]').then((secrets) => {
    cache.exists = Boolean(secrets)
    cache.secrets = {
      token: secrets?.token || null,
      secretKey: secrets?.secretKey || null,
      enableSignedUrls: secrets?.enableSignedUrls || false,
      signingKeyId: secrets?.signingKeyId || null,
      signingKeyPrivate: secrets?.signingKeyPrivate || null,
    }
    return cache
  })
}

export function saveSecrets(token, secretKey) {
  const doc = {
    _id: 'secrets.mux',
    _type: 'mux.apiKey',
    token,
    secretKey
  }
  return client.createOrReplace(doc).then(() => {
    cache.exists = true
    cache.secrets = { token, secretKey }
    return cache.secrets
  })
}

export async function testSecrets() {
  const dataset = client.clientConfig.dataset
  const result = await client.request({
    url: `/addons/mux/secrets/${dataset}/test`,
    withCredentials: true,
    method: 'GET',
  })

  if (result.statusCode && result.statusCode !== 200)
    throw new Error('Unable to reach Sanity')
  
  return result
}

export function createSigningKeys() {
  const dataset = client.clientConfig.dataset
  return client.request({
    url: `/addons/mux/signing-keys/${dataset}`,
    withCredentials: true,
    method: 'POST',
  })
}

export function saveSigningKeys(enableSignedUrls, signingKeyId, signingKeyPrivate) {
  return client.patch('secrets.mux')
    .set({ enableSignedUrls, signingKeyId, signingKeyPrivate })
    .commit()
    .then(() => {
      cache.exists = true
      cache.secrets = {
        enableSignedUrls,
        signingKeyId,
        signingKeyPrivate,
        ...cache.secrets
      }
      return cache.secrets
    })
}

export async function haveValidSigningKeys(signingKeyId, signingKeyPrivate) {
  if (!(signingKeyId && signingKeyPrivate)) {
    return false
  }

  const dataset = client.clientConfig.dataset
  const res = await client.request({
    url: `/addons/mux/signing-keys/${dataset}/${signingKeyId}`,
    withCredentials: true,
    method: 'GET',
  })

  return res.status === 200
}

export function testSecretsObservable() {
  const dataset = client.clientConfig.dataset
  return defer(() =>
    client.observable.request({
      url: `/addons/mux/secrets/${dataset}/test`,
      withCredentials: true,
      method: 'GET',
    })
  )
}
