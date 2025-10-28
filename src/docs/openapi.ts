// src/docs/openapi.ts

import { config } from '../config.js';

export const swaggerSpec = {
  openapi: '3.0.0',
  info: {
    title: 'MobilizaSP API',
    version: '1.0.0',
    description: 'API REST para consulta de linhas, posições de veículos, previsões de chegada, paradas próximas e rotas de transporte público em São Paulo.'
  },
  servers: [
    {
      url: `http://localhost:${config.port}`,
      description: 'Local development server'
    }
  ],
  paths: {
    '/api/v1/sptrans/linha': {
      get: {
        summary: 'Buscar linhas de ônibus',
        description: 'Busca linhas de ônibus por termo de busca (código ou descrição)',
        tags: ['SPTrans'],
        parameters: [
          {
            name: 'q',
            in: 'query',
            required: true,
            schema: {
              type: 'string',
              example: '701U'
            },
            description: 'Termo de busca (código ou nome da linha)'
          }
        ],
        responses: {
          '200': {
            description: 'Lista de linhas encontradas',
            content: {
              'application/json': {
                example: {
                  ok: true,
                  data: [
                    {
                      cl: 12345,
                      lc: false,
                      lt: '701U',
                      tl: '10',
                      tp: 'VILA MADALENA',
                      ts: 'TERMINAL JABAQUARA',
                      sl: 1
                    }
                  ]
                }
              }
            }
          },
          '400': {
            description: 'Parâmetros inválidos'
          }
        }
      }
    },
    '/api/v1/sptrans/posicao': {
      get: {
        summary: 'Posição de veículos de uma linha',
        description: 'Retorna a posição atual dos veículos de uma linha específica',
        tags: ['SPTrans'],
        parameters: [
          {
            name: 'linha',
            in: 'query',
            required: true,
            schema: {
              type: 'string',
              example: '701U-10'
            },
            description: 'Código da linha (ex: 701U-10)'
          }
        ],
        responses: {
          '200': {
            description: 'Posição dos veículos',
            content: {
              'application/json': {
                example: {
                  ok: true,
                  data: {
                    hr: '10:30:00',
                    l: [
                      {
                        c: '701U-10',
                        cl: 12345,
                        sl: 1,
                        lt: 'TERMINAL JABAQUARA',
                        lgl: -46.6358,
                        ltl: -23.6281
                      }
                    ]
                  }
                }
              }
            }
          },
          '400': {
            description: 'Parâmetros inválidos'
          }
        }
      }
    },
    '/api/v1/sptrans/previsao': {
      get: {
        summary: 'Previsão de chegada em parada',
        description: 'Retorna previsão de chegada de ônibus em uma parada específica',
        tags: ['SPTrans'],
        parameters: [
          {
            name: 'parada',
            in: 'query',
            required: true,
            schema: {
              type: 'string',
              example: '340015345'
            },
            description: 'Código da parada'
          },
          {
            name: 'linha',
            in: 'query',
            required: false,
            schema: {
              type: 'string',
              example: '701U-10'
            },
            description: 'Código da linha (opcional, filtra para uma linha específica)'
          }
        ],
        responses: {
          '200': {
            description: 'Previsão de chegada',
            content: {
              'application/json': {
                example: {
                  ok: true,
                  data: {
                    p: {
                      cp: 340015345,
                      np: 'SENADOR QUEIROZ',
                      ed: 'R SENADOR QUEIROZ',
                      py: -23.5751,
                      px: -46.6512,
                      l: [
                        {
                          c: '701U-10',
                          cl: 12345,
                          lt0: 'VILA MADALENA',
                          lt1: 'TERMINAL JABAQUARA',
                          qv: 2,
                          vs: [
                            {
                              p: 1234,
                              t: '10:30',
                              a: false,
                              ta: '2024-01-15T10:30:00Z',
                              py: -23.5751,
                              px: -46.6512
                            }
                          ]
                        }
                      ]
                    }
                  }
                }
              }
            }
          },
          '400': {
            description: 'Parâmetros inválidos'
          }
        }
      }
    },
    ...(config.mapsEnabled ? {
      '/api/v1/maps/rota': {
        get: {
          summary: 'Calcular rota de transporte público',
          description: 'Calcula rota de ônibus entre dois pontos usando Google Directions API',
          tags: ['Google Maps'],
          parameters: [
            {
              name: 'origem',
              in: 'query',
              required: true,
              schema: {
                type: 'string',
                example: 'Av Paulista, 1000, São Paulo'
              },
              description: 'Endereço de origem'
            },
            {
              name: 'destino',
              in: 'query',
              required: true,
              schema: {
                type: 'string',
                example: 'Terminal Jabaquara, São Paulo'
              },
              description: 'Endereço de destino'
            }
          ],
          responses: {
            '200': {
              description: 'Rota calculada',
              content: {
                'application/json': {
                  example: {
                    ok: true,
                    data: {
                      routes: [
                        {
                          legs: [
                            {
                              duration: { text: '35 minutos', value: 2100 },
                              distance: { text: '12.5 km', value: 12500 },
                              steps: []
                            }
                          ]
                        }
                      ]
                    }
                  }
                }
              }
            },
            '400': {
              description: 'Parâmetros inválidos'
            }
          }
        }
      },
      '/api/v1/maps/paradas-proximas': {
        get: {
          summary: 'Buscar paradas próximas',
          description: 'Busca paradas de ônibus próximas a um endereço',
          tags: ['Google Maps'],
          parameters: [
            {
              name: 'endereco',
              in: 'query',
              required: true,
              schema: {
                type: 'string',
                example: 'Av Paulista, 1000, São Paulo'
              },
              description: 'Endereço para buscar paradas próximas'
            },
            {
              name: 'raio',
              in: 'query',
              required: false,
              schema: {
                type: 'number',
                example: 500
              },
              description: 'Raio de busca em metros (100-5000, padrão: 500)'
            }
          ],
          responses: {
            '200': {
              description: 'Paradas encontradas',
              content: {
                'application/json': {
                  example: {
                    ok: true,
                    data: {
                      location: { lat: -23.5751, lng: -46.6512 },
                      stops: [
                        {
                          name: 'Parada de ônibus',
                          geometry: { location: { lat: -23.5751, lng: -46.6512 } },
                          vicinity: 'Av Paulista, 1000'
                        }
                      ]
                    }
                  }
                }
              }
            },
            '400': {
              description: 'Parâmetros inválidos ou endereço não encontrado'
            }
          }
        }
      }
    } : {}),
    '/healthz': {
      get: {
        summary: 'Health check',
        description: 'Endpoint de verificação de saúde do serviço',
        tags: ['Health'],
        responses: {
          '200': {
            description: 'Serviço está funcionando',
            content: {
              'application/json': {
                example: {
                  ok: true,
                  service: 'MobilizaSP',
                  timestamp: '2024-01-15T10:30:00Z',
                  uptime: 3600
                }
              }
            }
          }
        }
      }
    }
  },
  tags: [
    { name: 'SPTrans', description: 'Endpoints da API SPTrans Olho Vivo' },
    { name: 'Google Maps', description: 'Endpoints de mapas e rotas (requer GOOGLE_MAPS_API_KEY)' },
    { name: 'Health', description: 'Endpoints de monitoramento' }
  ]
};

