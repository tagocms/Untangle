# Untangle  
## Video Demo:  <https://youtu.be/8ZyYFzNdbyI>
## Description:

### Overview
Untangle is a note and task management webapp, created using Flask as the back-end, SQLITE3 as the database, HTML, CSS and JavaScript for scripting. The project was started on July 25th, 2024 and took until September 28th, 2024 to have its first version completed. I'm still going to update the project, but I'm happy at where it is currently.

### Landing Page
The landing page design and name were the first things created for the project. It was where it became clear the identity and purpose of the app: to untangle people's minds through a system of managing obligations, tasks, reminders, files and notes. By allowing people to relieve their minds of the burden of remembering everything and being perfect, we can empower them to lead healthier lives and do exactly what matters most to them. That was the whole idea behind the landing page, and, in turn, the app.

Here, the features of the app are shown and, even though some of the promised features aren't in the app as of now, they will surely be implemented in future updates.

It was here that was necessary to use a lot of CSS to our advantage, in order to make the page responsive and look great, no matter the device by which it was accessed. I also learned about flexboxes here, in order to create columns in the page.

### Sign Up and Log In Pages
The Sign Up and Log In pages were the first time this project used a database, and it was used in order to store user information. Also, Flask Session was utilized to allow the user to log in correctly to the webapp. I learned a lot about forms, routes and decorating functions in Python, making it so that certain routes require the user to be logged in to be accessed.

Also, error messages were shown to users who tried to create invalid accounts, with invalid e-mails or passwords. The same goes for users trying to log in to their accounts: the validation was clear and precise in making sure only users with access to all the necessary credentials could log in to the webapp. I also learned to create and use CSRF Tokens, to guarantee authentication from the user when submitting forms.

The Sign Up process also creates an item list called "Inbox", which is the default for all created items in the webapp.

### Webapp
#### Overview
The app is divided into three columns:
1. The configurations and filters column;
2. The item creation, searching and filtering list;
3. The item editing and reading column.

#### Item Creation
Item creation was the first functionality created for the webapp, and it functions as an input box, attached to a form. When the user types the title of the item they want to create and hit "ENTER", the browser sends a request to the server for the `/create` route, which the server handles by creating an item in the database, specifically the `items` table, with default values, which can later be updated using the third column's editing capabilities. The item is assigned to the default item list "Inbox" and can now be accessed!

#### Item Filtering
As of now, there are four ways of filtering data in the webapp:
1. By item type (all notes or tasks);
2. By item list (all items/notes belonging to a certain list);
3. By item completion (all completed tasks);
4. By searching the title of the item directly.

Each of these ways utilizes both Flask routes (`/filter`) and JavaScript functions (`filterDatabase`, `searchDatabase`) to make sure everything is working correctly. The JavaScript functions organize the filter type and send the request to the server, in the `/filter` route. The server then filters the relevant data and sends it back, asynchronously, so it can be used to filter the items on screen, displaying only the filtered items and hiding the other ones.

Regarding lists, they can be created and edited via modals, and also have their own routes for creating (`/create-list`), updating (`/update-list`) and deleting (`/delete-list`) lists. 

#### Item Reading, Editing, Completion and Deletion
This was by far the hardest part of the project, with so many twists, turns, bugs and hours spent trying to make the code work. Here, the user can click on one of the listed items on the second column and a function (`itemListener`) is called to create the reading/editing view in the third column. To make sure that `itemListener` worked correctly, it was necessary to make a lot of iterations in the code and ask the CS50 AI Duck Debugger for help a number of times, but, eventually, all the JavaScript code written inside and as functions separate from `itemListener` guaranteed that the item stored in the database would be correctly displayed on the screen.

With the item displayed, the user can edit the item's:
1. Priority;
2. Deadline;
3. Title;
4. Content/Body;
5. List;
6. Type.

All of these editing options use Asynchronous JavaScript (`updateDatabase`) to capture the updates in real time and send them to the server (route `/update`), awaiting its response and guaranteeing data accuracy. Then, another request is made and the server sends the response via the `/read` route, and the database items, tags and lists are saved to variables in JavaScript.

The user can also complete tasks and delete tasks/notes, by cliking on the checkbox and trash bin, respectively. This will make sure the item is removed from the current items list and, in case of deletion, deleted from the database entirely. This uses the `/update` and `/delete` routes.

### Credits
- UX/UI/Design - Olívia Gabardo
- Full Stack development - Tiago Camargo Maciel dos Santos

### References
- [CS50 AI Duck Debugger](https://cs50.ai/)
- [MDN Web Docs](https://developer.mozilla.org/pt-BR/)
- [W3 Schools](https://www.w3schools.com/)

### Requirements
- email_validator==2.2.0
- Flask==2.0.1
- flask_session==0.8.0
- flask_wtf==1.2.1
- SQLAlchemy==2.0.31
- Werkzeug==2.0.2

