# 🚀 Deployment Tutorial

Complete step-by-step guide to deploy your International Affairs ERP system to the cloud for FREE.

## 📖 Full Tutorial

See the complete deployment tutorial: [DEPLOYMENT_TUTORIAL.md](file:///C:/Users/saish/.gemini/antigravity/brain/adafde96-841b-4ef6-afeb-2a3dd12fec54/DEPLOYMENT_TUTORIAL.md)

## ⚡ Quick Reference

### Part 1: MongoDB Atlas (5 minutes)
1. Create account at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create M0 FREE cluster
3. Create database user
4. Allow network access (0.0.0.0/0)
5. Copy connection string

### Part 2: Render.com (15 minutes)
1. Sign up at [Render.com](https://render.com) with GitHub
2. Create Web Service from `Shanks015/INT-ERP`
3. Configure:
   - Build: `npm run build && cd server && npm install`
   - Start: `cd server && npm start`
4. Add 5 environment variables
5. Deploy!

### Part 3: Setup (5 minutes)
1. Open Shell in Render
2. Run: `cd server && node scripts/createAdminAuto.js`
3. Access your URL
4. Login: admin@dsu.edu / admin123

## 🎯 Environment Variables

```
PORT=5000
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/int-erp
JWT_SECRET=your-random-secret-key
CLIENT_URL=https://int-erp.onrender.com
NODE_ENV=production
```

## ✅ Success Checklist

- [ ] MongoDB cluster created
- [ ] Render service deployed
- [ ] Admin user created
- [ ] Can login successfully
- [ ] All modules working

## 🔗 Useful Links

- [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
- [Render.com](https://render.com)
- [UptimeRobot](https://uptimerobot.com) (keep service awake)
- [GitHub Repo](https://github.com/Shanks015/INT-ERP)

## 📞 Need Help?

Check the full tutorial for:
- Detailed screenshots
- Troubleshooting guide
- Pro tips
- Common issues and solutions

---

**Total Time**: ~30 minutes  
**Cost**: $0 (100% FREE)  
**Result**: Production-ready ERP system accessible worldwide!
