// tests/sptrans.contract.test.ts

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import nock from 'nock';
import axios from 'axios';
import { CookieJar } from 'tough-cookie';
import { wrapper } from 'axios-cookiejar-support';

describe('SPTrans Service Contract', () => {
  const BASE_URL = 'http://api.olhovivo.sptrans.com.br';
  let jar: CookieJar;
  let client: any;

  beforeEach(() => {
    jar = new CookieJar();
    client = wrapper(axios.create({
      baseURL: BASE_URL,
      jar,
      withCredentials: true
    }));
    nock.cleanAll();
  });

  afterEach(() => {
    nock.isDone();
  });

  describe('Authentication', () => {
    it('should authenticate with valid token', async () => {
      const scope = nock(BASE_URL)
        .post('/v2.1/Login/Autenticar')
        .query({ token: 'test-token' })
        .reply(200, true);

      const { data } = await client.post('/v2.1/Login/Autenticar?token=test-token');
      expect(data).toBe(true);
      scope.done();
    });

    it('should reject invalid token', async () => {
      const scope = nock(BASE_URL)
        .post('/v2.1/Login/Autenticar')
        .query({ token: 'invalid' })
        .reply(200, false);

      const { data } = await client.post('/v2.1/Login/Autenticar?token=invalid');
      expect(data).toBe(false);
      scope.done();
    });
  });

  describe('Buscar Linha', () => {
    it('should return lines for valid query', async () => {
      const mockResponse = [
        {
          cl: 12345,
          lc: false,
          lt: '701U',
          tl: '10',
          tp: 'VILA MADALENA',
          ts: 'TERMINAL JABAQUARA',
          sl: 1
        }
      ];

      const scope = nock(BASE_URL)
        .get('/v2.1/Linha/Buscar')
        .query({ termosBusca: '701U' })
        .reply(200, mockResponse);

      const { data } = await client.get('/v2.1/Linha/Buscar?termosBusca=701U');
      
      expect(data).toBeInstanceOf(Array);
      expect(data[0].lt).toBe('701U');
      scope.done();
    });
  });

  describe('Previsão', () => {
    it('should return predictions for stop', async () => {
      const mockResponse = {
        p: {
          cp: 340015345,
          np: 'SENADOR QUEIROZ',
          py: -23.5751,
          px: -46.6512,
          l: []
        }
      };

      const scope = nock(BASE_URL)
        .get('/v2.1/Previsao/Parada')
        .query({ codigoParada: '340015345' })
        .reply(200, mockResponse);

      const { data } = await client.get('/v2.1/Previsao/Parada?codigoParada=340015345');
      
      expect(data.p.cp).toBe(340015345);
      scope.done();
    });
  });
});

