# Strava Stats App

## Overview
The **Strava Stats App** is a work-in-progress web application that allows users to log in with their Strava accounts and view detailed statistics about their activities. The app currently displays your activity stats with visually appealing graphs to help you track your progress. Future features aim to provide tools for injury prevention and enhance the front-end design for a better user experience.

---

## Features
### Completed:
- **Strava Login Integration**: Users can log in securely using their Strava accounts.
- **Activity Stats Display**: After logging in, users can view their activity statistics.
- **Visual Graphs**: Current stats are presented with clean, interactive graphs to make data more digestible.

### Planned:
- **Injury Detector**: Identify potential injury risks by analyzing running patterns and detecting overtraining (e.g., running too much too soon).
- **Enhanced Front-End Design**: Update the user interface to improve visual appeal and user experience.

---

## Tech Stack
- **Backend**: Node.js, Express
- **Frontend**: HTML, CSS, JavaScript (to be enhanced)
- **Database**: MongoDB (for storing user and activity data)
- **API Integration**: Strava API
- **Libraries/Packages**:
  - Mongoose
  - Passport (for authentication)
  - Chart.js or D3.js (for graphs and data visualization)

---

## Installation
### Prerequisites:
- Node.js and npm installed on your system.
- A MongoDB instance (e.g., MongoDB Atlas or local MongoDB).
- A Strava API developer account and access to your API credentials.

### Steps:
1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd <repository-folder>
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the root directory and add the following variables:
   ```env
   STRAVA_CLIENT_ID=<your-strava-client-id>
   STRAVA_CLIENT_SECRET=<your-strava-client-secret>
   MONGODB_URI=<your-mongodb-connection-string>
   PORT=3000
   ```
4. Start the application:
   ```bash
   npm start
   ```
5. Open your browser and navigate to `http://localhost:3000`.

---

## Usage
1. Navigate to the application in your browser.
2. Log in using your Strava account.
3. View your activity stats presented in visually appealing graphs.
4. Stay tuned for updates, including the injury detector and an improved front-end design!

---

## Roadmap
- [x] Strava login and stats display
- [x] Basic visual graphs
- [ ] Implement injury detection algorithm
- [ ] Enhance front-end design and layout
- [ ] Add user settings and preferences

---

## Contributing
We welcome contributions to this project! If you would like to help:
1. Fork the repository.
2. Create a feature branch:
   ```bash
   git checkout -b <branch-name>
   ```
3. Commit your changes:
   ```bash
   git commit -m "Add your message here"
   ```
4. Push to the branch:
   ```bash
   git push origin <branch-name>
   ```
5. Submit a pull request.

---

## Acknowledgments
- Thanks to Strava for providing their API to power this application.
- Inspiration for future features comes from community feedback and best practices in injury prevention.


