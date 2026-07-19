# **Monash Course Planner**
This project was born due to the official Mon Planner being outdated and not including new units. It was first developed as an excel spreadsheet using lookup tables then later developed into this web app where it is free for anyone to use.</p>
The hope is that it may help make someone's course planning just a little easier. It checks unit-code prerequisites, corequisites, and prohibitions from the Monash handbook for units in your plan, plus semester offering detection. Credit-point degree rules and permission-based enrolment are not fully validated — always confirm against the official handbook before enrolling.</p>
Although it was originally created in a single html file it has since been migrated to vite. </p>
## **Features**
- 7000+ units to choose from (as of Dec 2025)
- Prerequisite / corequisite / prohibition checks (including supported VCE rules)
- Prior study menu for completed Monash units, VCE subjects, study scores, and ATAR
- Add and remove as many semesters as you wish
- Summer and Winter units
- Historical semester detection
- Duplicate unit detection
- Detection of semester based units
- Naming course plan
- Import and Export plans
- Add academic leave (such as deferring for a year)
- Drag and drop units
- Click and place for mobile
- Units swap when placed on eachother
- Credit point based unit width
- Course cost calculator

## **Development**
```bash
pnpm install
pnpm run dev
```

Local `pnpm run dev` serves `/api/requisites` via a Vite middleware that proxies the handbook. Production should be deployed on **Vercel** so the serverless `/api/requisites` route is available.

```bash
pnpm run deploy:vercel
```

Thank you for using my program</p>
**Created by Joel Knight**
