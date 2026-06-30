# Talaria Web Client - Deployment Guide

This guide covers deploying Talaria to a production server with HTTPS, nginx, and automatic SSL certificate renewal.

## Prerequisites

- A Linux server (Ubuntu 20.04+ or Debian 11+ recommended)
- A domain name pointing to your server's IP address
- Root access to the server
- Node.js 18+ and pnpm installed locally for building

## Quick Deployment

### 1. Build Locally

On your development machine:

```bash
cd talaria-web-min
pnpm install
pnpm build
```

This creates a `dist/` directory with the production build.

### 2. Deploy to Server

Transfer the files to your server:

```bash
# Option A: Copy directly
scp -r dist/* user@your-server:/var/www/talaria/dist/

# Option B: Use rsync for incremental updates
rsync -avz --delete dist/ user@your-server:/var/www/talaria/dist/
```

### 3. Run Deployment Script

On your server:

```bash
# Clone or copy the repository
cd /path/to/talaria-web-min

# Run the deployment script with your domain
sudo ./scripts/deploy.sh talaria.yourdomain.com
```

The script will:
- Install nginx and certbot
- Configure nginx with SSL
- Obtain an SSL certificate from Let's Encrypt
- Set up automatic certificate renewal
- Configure proper file permissions

### 4. Verify Deployment

Visit `https://talaria.yourdomain.com` in your browser. You should see the Talaria login page.

## Manual Deployment

If you prefer to configure everything manually:

### 1. Install Dependencies

```bash
sudo apt update
sudo apt install nginx certbot python3-certbot-nginx
```

### 2. Copy Build Files

```bash
sudo mkdir -p /var/www/talaria/dist
sudo cp -r dist/* /var/www/talaria/dist/
sudo chown -R www-data:www-data /var/www/talaria
sudo chmod -R 755 /var/www/talha
```

### 3. Configure Nginx

Copy the nginx configuration:

```bash
sudo cp nginx/talaria.conf /etc/nginx/sites-available/talha
sudo sed -i 's/talaria.example.com/your-domain.com/g' /etc/nginx/sites-available/talha
sudo ln -s /etc/nginx/sites-available/talha /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
```

Test and restart nginx:

```bash
sudo nginx -t
sudo systemctl restart nginx
```

### 4. Obtain SSL Certificate

```bash
sudo certbot --nginx -d your-domain.com
```

Follow the prompts to complete the certificate setup.

### 5. Enable Auto-Renewal

```bash
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer
```

## Updating Talaria

When new versions are released:

```bash
# 1. Build locally
pnpm build

# 2. Upload to server
rsync -avz --delete dist/ user@server:/var/www/talha/dist/

# 3. Restart nginx (optional - static files don't need restart)
sudo systemctl restart nginx
```

## Security Considerations

### Firewall Configuration

If you have a firewall enabled, open ports 80 and 443:

```bash
sudo ufw allow 'Nginx Full'
sudo ufw status
```

### Matrix Homeserver Configuration

Talaria needs to connect to a Matrix homeserver. Configure the homeserver URL in `src/config.ts`:

```typescript
export const HOMESERVER_URL = "https://matrix.yourdomain.com";
```

Ensure your Matrix homeserver has CORS configured to allow requests from your Talaria domain.

### Content Security Policy

The nginx configuration includes security headers. You may want to add a Content Security Policy:

```nginx
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://matrix.yourdomain.com;" always;
```

## Troubleshooting

### SSL Certificate Issues

If certbot fails:
- Ensure your domain DNS is pointing to the server
- Check that port 80 is accessible from the internet
- Review certbot logs: `sudo certbot certificates`

### Nginx Not Starting

Check nginx configuration:
```bash
sudo nginx -t
sudo systemctl status nginx
```

### Build Errors

If the build fails:
- Ensure you're using Node.js 18+
- Delete `node_modules` and reinstall: `rm -rf node_modules && pnpm install`
- Check for TypeScript errors: `pnpm tsc --noEmit`

### WebSocket Connection Issues

If Talaria can't connect to the homeserver:
- Verify the homeserver URL in `src/config.ts`
- Check CORS headers on the homeserver
- Review browser console for connection errors

## Performance Optimization

### Enable Gzip Compression

The nginx configuration includes gzip compression. Verify it's working:

```bash
curl -H "Accept-Encoding: gzip" -I https://your-domain.com
```

Look for `Content-Encoding: gzip` in the response.

### Browser Caching

Static assets are cached for 1 year. When deploying updates, Vite generates unique filenames, so cache invalidation is automatic.

### CDN (Optional)

For global deployments, consider using a CDN like Cloudflare:
1. Point your domain to Cloudflare
2. Enable "Always Use HTTPS"
3. Set SSL/TLS mode to "Full (strict)"
4. Configure caching rules for static assets

## Monitoring

### Check Service Status

```bash
sudo systemctl status nginx
sudo systemctl status certbot.timer
```

### View Logs

```bash
# Nginx access logs
sudo tail -f /var/log/nginx/access.log

# Nginx error logs
sudo tail -f /var/log/nginx/error.log
```

### SSL Certificate Expiry

```bash
sudo certbot certificates
```

## Backup

Back up your SSL certificates and nginx configuration:

```bash
sudo tar -czf talha-backup-$(date +%Y%m%d).tar.gz \
  /etc/nginx/sites-available/talha \
  /etc/letsencrypt/live/your-domain.com/
```

## Support

For issues or questions:
- Check the [Matrix documentation](https://matrix.org/docs/)
- Review [nginx documentation](https://nginx.org/en/docs/)
- Consult [Let's Encrypt documentation](https://letsencrypt.org/docs/)
