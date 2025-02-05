export const mockAthlete = {
    id: 12345,
    username: "mockuser",
    firstname: "Mock",
    lastname: "User",
    city: "Mock City",
    state: "MC",
    country: "MCY",
    sex: "M",
    premium: true,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z"
};

// Generate a year of mock activities
function generateMockActivities() {
    const activities = [];
    const startDate = new Date();
    startDate.setFullYear(startDate.getFullYear() - 1);

    // Training phases
    const phases = [
        { name: 'Base Building', weeks: 12, intensity: 'low' },
        { name: 'Build Phase', weeks: 12, intensity: 'medium' },
        { name: 'Peak Phase', weeks: 12, intensity: 'high' },
        { name: 'Race Season', weeks: 12, intensity: 'peak' },
        { name: 'Recovery', weeks: 4, intensity: 'very low' }
    ];

    let currentDate = new Date(startDate);
    let weeklyVolume = 30; // Starting weekly volume in km
    let currentPhase = 0;
    let weekInPhase = 0;

    while (currentDate <= new Date()) {
        const phase = phases[currentPhase];
        const daysInWeek = [0, 2, 3, 5, 6]; // Training days pattern

        // Adjust volume based on phase
        switch (phase.intensity) {
            case 'low': weeklyVolume = 30 + (weekInPhase * 0.5); break;
            case 'medium': weeklyVolume = 40 + (weekInPhase * 0.7); break;
            case 'high': weeklyVolume = 50 + (weekInPhase * 0.3); break;
            case 'peak': weeklyVolume = 55 - (weekInPhase * 0.2); break;
            case 'very low': weeklyVolume = 25; break;
        }

        // Create activities for each training day
        daysInWeek.forEach(dayOffset => {
            const activityDate = new Date(currentDate);
            activityDate.setDate(activityDate.getDate() + dayOffset);
            
            if (activityDate > new Date()) return;

            // Determine activity type and distance
            let activityType, distance, speed;
            const rand = Math.random();
            
            if (dayOffset === 6) { // Long run day
                activityType = "Long Run";
                distance = (weeklyVolume * 0.4) * 1000; // 40% of weekly volume
                speed = 2.8 + (Math.random() * 0.4); // ~10-11 km/h
            } else if (dayOffset === 3 && phase.intensity !== 'very low') { // Quality session
                activityType = rand > 0.5 ? "Tempo Run" : "Interval Training";
                distance = (weeklyVolume * 0.2) * 1000; // 20% of weekly volume
                speed = 3.3 + (Math.random() * 0.5); // ~12-14 km/h
            } else { // Easy runs
                activityType = "Easy Run";
                distance = (weeklyVolume * 0.15) * 1000; // 15% of weekly volume
                speed = 2.5 + (Math.random() * 0.3); // ~9-10 km/h
            }

            // Add some variation
            distance *= 0.9 + (Math.random() * 0.2); // ±10% variation
            speed *= 0.95 + (Math.random() * 0.1); // ±5% variation

            // Calculate heart rate based on activity type and intensity
            let baseHR, hrVariation, cadence, cadenceVariation;
            switch (activityType) {
                case "Easy Run":
                    baseHR = 140; // ~70% max HR
                    hrVariation = 10;
                    cadence = 165;
                    cadenceVariation = 5;
                    break;
                case "Long Run":
                    baseHR = 150; // ~75% max HR
                    hrVariation = 15;
                    cadence = 170;
                    cadenceVariation = 5;
                    break;
                case "Tempo Run":
                    baseHR = 165; // ~82% max HR
                    hrVariation = 10;
                    cadence = 175;
                    cadenceVariation = 3;
                    break;
                case "Interval Training":
                    baseHR = 175; // ~87% max HR
                    hrVariation = 20;
                    cadence = 180;
                    cadenceVariation = 5;
                    break;
                case "Race":
                    baseHR = 180; // ~90% max HR
                    hrVariation = 15;
                    cadence = 185;
                    cadenceVariation = 3;
                    break;
                default:
                    baseHR = 145;
                    hrVariation = 15;
                    cadence = 170;
                    cadenceVariation = 5;
            }

            // Add fatigue factor based on distance and phase intensity
            const fatigueFactor = 1 + (distance/10000) * 0.1; // HR increases with distance
            baseHR *= fatigueFactor;

            // Calculate actual heart rate with variation
            const avgHR = Math.round(baseHR + (Math.random() * hrVariation - hrVariation/2));
            const maxHR = Math.round(avgHR + 15 + Math.random() * 10);

            // Calculate actual cadence with variation
            const avgCadence = Math.round(cadence + (Math.random() * cadenceVariation - cadenceVariation/2));

            // Add some special workouts during peak phase
            if (phase.intensity === 'peak' && rand > 0.8) {
                if (rand > 0.9) {
                    activityType = "Race";
                    distance = rand > 0.95 ? 21097.5 : 10000; // Half marathon or 10K
                    speed *= 1.2; // Race pace is faster
                } else {
                    activityType = "Track Workout";
                    distance = 8000;
                    speed *= 1.1;
                }
            }

            activities.push({
                id: Date.now() + activities.length,
                name: activityType,
                type: "Run",
                distance: Math.round(distance),
                moving_time: Math.round(distance / (speed * 1000/3600)),
                elapsed_time: Math.round(distance / (speed * 1000/3600) * 1.1),
                average_speed: speed,
                start_date: activityDate.toISOString(),
                start_date_local: activityDate.toISOString(),
                phase: phase.name,
                // Add elevation gain based on distance and terrain variation
                total_elevation_gain: Math.round(distance/1000 * (5 + Math.random() * 15)),
                // Add heart rate data
                average_heartrate: avgHR,
                max_heartrate: maxHR,
                // Add cadence data
                average_cadence: avgCadence,
                // Add stride length data (calculated from speed and cadence)
                stride_length: (speed * 1000/3600) / (avgCadence/120), // in meters
                // Add training effect data
                perceived_exertion: activityType === "Easy Run" ? 3 : 
                                  activityType === "Long Run" ? 4 :
                                  activityType === "Tempo Run" ? 5 :
                                  activityType === "Interval Training" ? 6 :
                                  activityType === "Race" ? 7 : 4
            });
        });

        // Move to next week
        currentDate.setDate(currentDate.getDate() + 7);
        weekInPhase++;

        // Move to next phase if current phase is complete
        if (weekInPhase >= phase.weeks) {
            currentPhase = (currentPhase + 1) % phases.length;
            weekInPhase = 0;
        }
    }

    return activities.sort((a, b) => new Date(b.start_date) - new Date(a.start_date));
}

const generatedActivities = generateMockActivities();
export const mockActivities = generatedActivities; 