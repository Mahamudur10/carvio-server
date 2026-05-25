# Carvio Server - Backend API

## Live URL
🔗 **API:** https://carvio-server.vercel.app

---

## Features

- ✅ User Registration & Login (Email/Password)
- ✅ Car CRUD Operations (Add, Update, Delete, View)
- ✅ Booking System
- ✅ MongoDB Database
- ✅ Secure Password Hashing (bcrypt)
- ✅ CORS Enabled for Frontend

---

## API Endpoints

### Auth
| Method | Endpoint | What it does |
|--------|----------|--------------|
| POST | `/api/auth/register` | Create new account |
| POST | `/api/auth/login` | Login user |

### Cars
| Method | Endpoint | What it does |
|--------|----------|--------------|
| GET | `/explore-cars` | Get all cars |
| GET | `/cars/:id` | Get single car |
| POST | `/cars` | Add new car |
| GET | `/api/my-cars?email=xxx` | Get user's cars |
| PUT | `/api/cars/:id` | Update car |
| DELETE | `/api/cars/:id` | Delete car |

### Bookings
| Method | Endpoint | What it does |
|--------|----------|--------------|
| POST | `/api/bookings` | Create booking |
| GET | `/api/my-bookings?email=xxx` | Get user's bookings |

---

## Tech Stack

- **Node.js** + **Express.js**
- **MongoDB Atlas**
- **bcryptjs** (Password Hashing)
- **Vercel** (Hosting)

---

## Setup Locally

```bash
# Clone repo
git clone https://github.com/Mahamudur10/carvio-server.git
cd carvio-server

# Install dependencies
npm install

# Create .env file
echo "MONGODB_URI=your_mongodb_uri" > .env
echo "PORT=5000" >> .env

# Run server
npm run dev
