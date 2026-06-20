# ABOA – Plataforma de Recomendação Gastronômica

## Projeto Integrador IV – FATEC Cotia

### Integrantes

* Leandro Cardoso – RA 27003392423007
* Celso Sebastião
* Jhonathan Henrique

---

## Sobre o Projeto

ABOA é uma plataforma web Full-Stack desenvolvida para auxiliar usuários na descoberta de bares e restaurantes próximos através de geolocalização, busca inteligente e recomendações gastronômicas.

A aplicação permite localizar estabelecimentos, visualizar cardápios, obter rotas de navegação e filtrar resultados por distância geográfica.

---

## Aplicação Publicada

### Frontend

https://aboa-1yssafeo7-jhow-s-projects3.vercel.app/

### Backend

(https://aboa-iv.onrender.com)

---

## Repositórios

### Frontend

https://github.com/1jhoww/ABOA-IV/tree/main/ABOA%20-%20lllSEM/aboa-react

### Backend

https://github.com/1jhoww/ABOA-IV/tree/main/ABOA%20-%20lllSEM/backend

---

# Funcionalidades

## Usuários

* Cadastro de usuário
* Login autenticado via JWT
* Gerenciamento de conta

## Estabelecimentos

* Cadastro de estabelecimentos
* Upload de imagens
* Gerenciamento de cardápios

## Busca Inteligente

* Busca por nome
* Busca por categoria
* Busca por palavras-chave

## Geolocalização

Identificação automática da localização do usuário utilizando a API de Geolocalização do navegador.

## Busca por Raio Geográfico

Pesquisa de estabelecimentos dentro de:

* 5 km
* 10 km
* 15 km
* 20 km

Utilizando índices geoespaciais MongoDB Atlas (2dsphere).

## Geração de Rotas

Cálculo de trajetos entre usuário e estabelecimento através de:

* OpenStreetMap
* React Leaflet
* OSRM

Exibindo:

* Distância
* Tempo estimado
* Navegação assistida

## Observabilidade

O back-end conta com mecanismos básicos de observabilidade para acompanhar o funcionamento da API em execução:

- *Logs estruturados de requisições HTTP* com *Morgan*, exibindo no terminal, para cada requisição: data/hora, método HTTP, rota, status da resposta, tamanho e tempo de resposta.
- *Endpoint de health check* em GET /api/health, que retorna o status da API, o tempo de atividade (uptime) e a situação da conexão com o banco de dados (MongoDB).

### Como visualizar

Com o backend rodando (npm run dev), acesse no navegador ou via Postman/Insomnia:


http://localhost:5000/api/health


Resposta esperada:

json
{
  "ok": true,
  "message": "ABOA API online",
  "uptime_seconds": 120,
  "timestamp": "2026-06-20T14:00:00.000Z",
  "database": "connected"
}

# Tecnologias Utilizadas

## Frontend

* React
* Vite
* React Router DOM
* React Leaflet
* CSS Modules

## Backend

* Node.js
* Express
* MongoDB Atlas
* Mongoose
* JWT
* Bcrypt
* Multer
* CORS
* Dotenv

## DevOps

* GitHub
* Vercel
* Render

---

# Arquitetura

Frontend React

↓

API REST Node.js + Express

↓

MongoDB Atlas

↓

OpenStreetMap + Nominatim + OSRM

---

# Estrutura do Projeto

ABOA
│
├── aboa-react
│ ├── src
│ ├── pages
│ ├── components
│ └── styles
│
└── backend
├── config
├── middleware
├── models
├── routes
├── uploads
└── server.js

---

# Instalação

## Backend

cd backend

npm install

npm run dev

## Frontend

cd aboa-react

npm install

npm run dev

---

# Variáveis de Ambiente

Arquivo .env

PORT=5000

MONGO_URI=sua_string_mongodb

JWT_SECRET=sua_chave

JWT_EXPIRES_IN=1d

---

# Novas Features do Projeto Integrador IV

### Feature 1

Geolocalização do Usuário

### Feature 2

Busca por Raio Geográfico

### Feature 3

Geração de Rotas

---

# Deploy

Frontend hospedado na Vercel.

Backend hospedado no Render.

---

# Melhorias Futuras

* Sistema de avaliações
* Recomendações com IA
* Favoritos
* Aplicativo Mobile
* Arquitetura de Microsserviços

---

# Licença

Projeto acadêmico desenvolvido para o curso de Desenvolvimento de Software Multiplataforma da FATEC Cotia.
