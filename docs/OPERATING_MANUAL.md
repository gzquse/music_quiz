# Music Survey Platform - Operating Manual

## Table of Contents

1. [Overview](#overview)
2. [For Survey Respondents](#for-survey-respondents)
3. [For Administrators](#for-administrators)
4. [Managing Surveys](#managing-surveys)
5. [Viewing Analytics](#viewing-analytics)
6. [Troubleshooting](#troubleshooting)

---

## Overview

The Music Survey Platform is a web-based application designed to collect and analyze responses about piano playing experiences. It consists of two main interfaces:

- **Public Interface**: Where respondents take surveys
- **Admin Dashboard**: Where administrators create surveys and view analytics

### URLs

- **Public Survey**: https://music-quiz-xi.vercel.app/
- **Admin Dashboard**: https://music-quiz-xi.vercel.app/admin (restricted access)

---

## For Survey Respondents

### Taking a Survey

1. Visit the public URL: https://music-quiz-xi.vercel.app/
2. You will see a list of available surveys
3. Click **"Take Survey"** on the survey you wish to complete
4. Read the instructions at the top of the survey
5. Answer each question:
   - **Scale questions (1-5)**: Click on the number that best represents your response
   - **Text questions**: Type your response in the text box
   - **Choice questions**: Click on the option that applies to you
6. A progress bar at the top shows how many required questions you have completed
7. Click **"Submit Response"** when finished
8. You will see a confirmation message when your response is recorded

### Rating Scale Reference

| Score | Meaning |
|-------|---------|
| 1 | Not at all |
| 2 | Slightly |
| 3 | Moderately |
| 4 | Very |
| 5 | Extremely |

---

## For Administrators

### Accessing the Admin Dashboard

1. Navigate to: https://music-quiz-xi.vercel.app/admin
2. Click **"Continue with Google"** or **"Continue with GitHub"**
3. Sign in with your authorized admin email
4. You will be redirected to the admin dashboard

**Note**: Only email addresses listed in the admin allowlist can access the dashboard. Contact the system administrator to add new admin users.

### Dashboard Overview

The admin dashboard displays:

- **Total Surveys**: Number of surveys created
- **Active Surveys**: Surveys visible to the public
- **Total Responses**: All responses collected
- **This Week**: Responses from the last 7 days

---

## Managing Surveys

### Creating a New Survey

1. From the dashboard, click **"Quizzes"** in the sidebar (or click "Create New")
2. Click **"New Survey"** button
3. Fill in the survey details:
   - **Title**: Name of the survey (e.g., "Post-Session Playing Experience Survey")
   - **Description**: Brief description shown to respondents
   - **Instructions**: Detailed instructions displayed at the top of the survey
4. Configure the rating scale:
   - **Minimum Value**: Usually 1
   - **Maximum Value**: Usually 5
   - **Scale Labels**: One label per line (e.g., "Not at all", "Slightly", etc.)
5. Add questions by clicking **"Add Question"**
6. Check **"Active (visible to public)"** when ready to publish
7. Click **"Create Survey"**

### Question Types

| Type | Description | Use Case |
|------|-------------|----------|
| Scale (1-5) | Numeric rating with labels | Rating experience, agreement, frequency |
| Text Input | Free-form text response | Open-ended feedback, descriptions |
| Multiple Choice | Single selection from options | Demographics, yes/no questions |

### Adding Questions

For each question:

1. Enter the **Question Text**
2. Select the **Question Type** (Scale, Text, or Choice)
3. Check **Required** if the question must be answered
4. For Choice questions, enter options (one per line)
5. Use the arrow buttons to reorder questions
6. Click the trash icon to delete a question

### Editing a Survey

1. Go to **Quizzes** in the sidebar
2. Click **"Edit"** on the survey you want to modify
3. Make your changes
4. Click **"Save Changes"**

**Warning**: Editing questions after responses have been collected may affect analytics accuracy.

### Activating/Deactivating Surveys

1. Go to **Quizzes** in the sidebar
2. Click **"Activate"** or **"Deactivate"** next to the survey
3. Deactivated surveys are hidden from the public but data is preserved

### Deleting a Survey

1. Go to **Quizzes** in the sidebar
2. Click the trash icon next to the survey
3. Confirm deletion

**Warning**: Deleting a survey permanently removes all associated responses.

---

## Viewing Analytics

### Accessing Analytics

1. Go to **Quizzes** in the sidebar
2. Click **"Analytics"** next to the survey you want to analyze

### Analytics Dashboard Features

#### Summary Statistics
- **Total Responses**: Number of completed surveys
- **Last 30 Days**: Recent response count
- **Questions**: Number of questions in the survey

#### Average Score Chart
- Bar chart showing the average score for each scale question
- Hover over bars to see exact values

#### Score Distribution
- Individual charts for each scale question
- Shows how many respondents selected each score (1-5)
- Useful for identifying patterns and outliers

#### Recent Responses Table
- Lists the most recent survey submissions
- Shows date and scores for each scale question
- Scroll to see more responses

### Sharing Survey Links

To share a survey with respondents:

1. Go to the survey's Analytics page
2. Copy the survey URL from the address bar, or
3. If no responses yet, use the "Copy Link" button

Survey URL format: `https://music-quiz-xi.vercel.app/quiz/[survey-id]`

---

## Troubleshooting

### Common Issues

#### "Access Denied" when logging in
- Your email is not in the admin allowlist
- Contact the system administrator to add your email

#### Survey not appearing for respondents
- Check that the survey is set to "Active"
- Verify the survey has at least one question

#### Analytics showing no data
- Ensure responses have been submitted
- Check that you're viewing the correct survey

#### OAuth login not working
- Clear browser cookies and try again
- Ensure you're using an authorized admin email
- Check that OAuth redirect URLs are correctly configured

### Getting Help

For technical issues or to request new admin access, contact:
- System Administrator: [Add contact email]

---

## Appendix: Environment Configuration

For system administrators managing the deployment:

### Required Environment Variables

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_INSTANTDB_APP_ID` | InstantDB application ID |
| `NEXTAUTH_SECRET` | Random secret for session encryption |
| `NEXTAUTH_URL` | Production URL (https://music-quiz-xi.vercel.app) |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `GITHUB_ID` | GitHub OAuth app ID |
| `GITHUB_SECRET` | GitHub OAuth app secret |
| `ADMIN_EMAILS` | Comma-separated list of admin emails |

### Adding New Administrators

1. Access the Vercel project dashboard
2. Go to Settings > Environment Variables
3. Edit `ADMIN_EMAILS` to add new emails (comma-separated)
4. Redeploy the application

### Database Management

- Database: InstantDB (https://instantdb.com)
- Access the InstantDB dashboard to view raw data
- Use the seed script to populate demo data: `npx tsx scripts/seed.ts`

---

*Document Version: 1.0*
*Last Updated: January 2026*

