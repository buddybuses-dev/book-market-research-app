# Deployment Guide

Book Market Research App supports multiple deployment options.

## Quick Start (Docker)

The easiest way to deploy is using Docker and docker-compose.

### Prerequisites

- Docker installed on your system
- Environment variables ready (see `.env.example`)

### Deployment Steps

1. **Clone the repository**
   ```bash
   git clone https://github.com/buddybuses-dev/book-market-research-app.git
   cd book-market-research-app
   ```

2. **Create `.env.local` with your API keys**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your actual API keys
   ```

3. **Build and run with docker-compose**
   ```bash
   docker-compose up --build
   ```

   The app will be available at `http://localhost:3000`

### Using Docker (Manual Build)

If you prefer to build and run manually:

```bash
# Build the image
docker build -t book-market-research-app .

# Run the container
docker run -p 3000:3000 \
  --env-file .env.local \
  book-market-research-app
```

## Production Deployment Options

### Option 1: Vercel (Recommended for Next.js)

1. Push code to GitHub
2. Connect GitHub repo to Vercel: https://vercel.com/new
3. Add environment variables in Vercel dashboard
4. Deploy

**Pros:**
- Automatic deployments from git
- Zero-config Next.js setup
- Edge functions support
- Free tier available

**Cons:**
- Limited to Vercel infrastructure

### Option 2: Docker Container Registry (AWS ECR, Google Cloud, Azure)

1. Build image and push to your registry
   ```bash
   docker build -t your-registry/book-market-research-app:latest .
   docker push your-registry/book-market-research-app:latest
   ```

2. Deploy to your container orchestration platform:
   - **AWS ECS/Fargate**
   - **Google Cloud Run**
   - **Azure Container Instances**
   - **Kubernetes** (any cluster)

### Option 3: Self-Hosted VPS

1. SSH into your server
2. Clone repository
3. Install Docker
4. Run docker-compose up
5. Set up reverse proxy (Nginx/Caddy) for HTTPS

## Environment Variables Required

**Essential:**
- `SERPAPI_API_KEY` - Google Trends search
- `N8N_WEBHOOK_URL` - Webhook for automation handoff

**Optional but Recommended:**
- `AMAZON_SP_API_WEBHOOK_URL` - Amazon product data
- `ELEVENLABS_API_KEY` + `ELEVENLABS_VOICE_ID` - Audiobook voiceovers

**Other Optional:**
- `DATAFORSEO_LOGIN` + `DATAFORSEO_PASSWORD` - Keyword research
- `KEYWORDS_EVERYWHERE_API_KEY` - Keyword data
- `SCRAPINGBEE_API_KEY` - Web scraping
- `CRAYO_API_KEY` - Video voiceover

## Monitoring & Health Checks

The Docker image includes a built-in health check that runs every 30 seconds.

To manually verify the app is running:
```bash
curl http://localhost:3000
```

## Scaling Considerations

- **Single instance:** docker-compose up
- **Multiple instances:** Load balance via nginx/haproxy
- **Auto-scaling:** Use AWS Auto Scaling Groups or Kubernetes deployments
- **Database:** Currently stateless (uses browser localStorage + n8n webhook)

## Security Best Practices

1. **Never commit `.env.local`** to git (included in `.gitignore`)
2. **Use HTTPS** in production
   - Nginx reverse proxy with Let's Encrypt
   - Or platform-native HTTPS (Vercel, etc.)
3. **Rotate API keys** periodically
4. **Use secrets management**
   - Vercel: Dashboard → Settings → Environment Variables
   - Docker: Use docker secrets or external vault
5. **Enable n8n webhook authentication** (optional)
   - Set `N8N_WEBHOOK_SECRET` + `N8N_WEBHOOK_SECRET_MODE`

## Troubleshooting

### App won't start
- Check `.env.local` exists with all required vars
- Verify API keys are valid
- Check Docker logs: `docker logs <container_id>`

### Port already in use
- Change port in `docker-compose.yml` or CLI
- Or kill existing process: `lsof -i :3000`

### Webhook not receiving data
- Verify `N8N_WEBHOOK_URL` is correct
- Check n8n workflow is Active
- Enable "Test" mode in n8n webhook node

## Support

For issues or questions:
1. Check logs: `docker logs book-market-research-app`
2. Review README.md for feature documentation
3. Check n8n workflow status and logs
