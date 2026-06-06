## What is endetted?
endetted is a web-based solution that allows you to split payments between a group of friends if you have shared expenditures. If you ever go out on a trip with friends and agree to split costs, you would normally have to write down expenditures on notes, constantly ensure it is up to date, debate over the history of who went where, and log any settlements that have been made during or after the trip. However, with Endetted, all of these tedious clerical tasks will be done automatically for you!

## How do you use it?
After logging in to an account (or signing up for one), you can select "create group" to create a new group. Within that new group, you first need to search up and add all of the people that you are travelling with into your group. 

After your group is set up, you can log a purchase. Selecting all relevant group members and writing down the payment details will let the software automatically divide the costs among your group members and update each person's balance sheet accordingly. 

### Other Features:
- **Selective splitting**: if several people from a group are not involved in a particular purchase, you can remove them from that particular payment, so the costs are split among the relevant group members. 
- **Purchase logging**: Keep a comprehensive and adjustable history of every purchase the group made, with a separate feature logging your own purchases for the group
- **Payment settlement logging**: Logs final payments between group members when settling final balances. 

## Installation & Setup
Before setting up the program, ensure you have the following dependencies installed on your system:
npm version 11.12.1
Node version 24.x

First clone the repo
`git clone https://github.com/NathanYJiang/CS35L.git`

Then simply run from the repo's root folder
`cd CS35L
npm run dev`

You may need to install dependencies, do so with
`npm install`

Dependencies may also need to be installed both the frontend and backend separately
`cd frontend
npm install`

`cd ..`

`cd backend
npm install`

To ensure the system operates properly, run `npm run test`

## UML Entity-Relation diagram

!(docs/erDiagram.png)

## UML Sequence Diagrams

Below are sequence diagrams for the core flows in endetted. Each diagram shows the interaction between the **User**, **React Frontend** (browser), **Express Backend** (Node.js server), **Firebase Auth**, and **Cloud Firestore**.

---

### 1. Add an Expense (Selective Split)

```mermaid
sequenceDiagram
    actor U as User
    participant R as React Frontend
    participant B as Express Backend
    participant FA as Firebase Auth
    participant FS as Cloud Firestore

    U->>R: Click "+ Add expense"
    R-->>U: Show AddExpenseModal<br/>(pre-selects all members for split)
    U->>R: Select "Paid by" member
    U->>R: Toggle "Split between" members<br/>(deselect non-participants)
    U->>R: Enter amount & purpose
    U->>R: Click "Save Expense"
    R->>B: POST /api/groups/:id/expenses<br/>{ amount, purpose, paidBy, splitBetween }<br/>Authorization: Bearer <token>
    B->>FA: verifyIdToken(token)
    FA-->>B: Decoded token (uid)
    B->>FS: groups/:id.get()
    FS-->>B: Group data
    B->>B: Verify requester is a member
    B->>B: Validate required fields
    B->>FS: groups/:id/expenses.add({<br/>  amount, purpose, paidBy, addedBy,<br/>  splitBetween, createdAt: serverTimestamp<br/>})
    FS-->>B: New expense doc ref
    B-->>R: 201 { id, amount, purpose, paidBy, addedBy, splitBetween }
    R->>R: Prepend expense to activityEntries state
    R->>R: Recalculate balances via groupBalances util
    R-->>U: Close modal, update dashboard balances & activity
```

---

### 2. Record a Settlement Payment

```mermaid
sequenceDiagram
    actor U as User
    participant R as React Frontend
    participant B as Express Backend
    participant FA as Firebase Auth
    participant FS as Cloud Firestore

    U->>R: Navigate to Settlements page
    R->>B: GET /api/groups/:id (group details)<br/>GET /api/groups/:id/members<br/>GET /api/groups/:id/expenses<br/>GET /api/groups/:id/settlements<br/>Authorization: Bearer <token>
    B->>FA: verifyIdToken(token) [×4]
    FA-->>B: Decoded token [×4]
    B->>FS: Fetch group, members, expenses, settlements
    FS-->>B: All data
    B-->>R: 200 [group, members, expenses, settlements]
    R->>R: Compute balances:<br/>buildOwedFromExpenses() → applySettlements() → netBalancesForUser()
    R-->>U: Display balances, "You still owe" rows,<br/>suggested settlements, payment history

    U->>R: Click "Record $X" button (auto-fills form)<br/>OR manually select member & enter amount
    U->>R: Click "Record payment"
    R->>B: POST /api/groups/:id/settlements<br/>{ toUserId, amount }<br/>Authorization: Bearer <token>
    B->>FA: verifyIdToken(token)
    FA-->>B: Decoded token (uid = fromUserId)
    B->>FS: groups/:id.get()
    FS-->>B: Group data
    B->>B: Validate: recipient exists, amount > 0,<br/>not self, recipient is member
    B->>FS: groups/:id/settlements.add({<br/>  fromUserId, toUserId, amount,<br/>  createdBy, createdAt: serverTimestamp<br/>})
    FS-->>B: New settlement doc ref
    B-->>R: 201 { id, fromUserId, toUserId, amount }
    R->>R: Re-fetch all data → recompute balances
    R-->>U: Updated balances & payment history
```

---

### 3. View Group Dashboard (Data Aggregation)

```mermaid
sequenceDiagram
    actor U as User
    participant R as React Frontend
    participant B as Express Backend
    participant FA as Firebase Auth
    participant FS as Cloud Firestore

    U->>R: Click on a group from MyGroups
    R->>R: Navigate to /groups/:id (GroupDetails)
    R->>B: Promise.all([<br/>  GET /api/groups/:id,<br/>  GET /api/groups/:id/members,<br/>  GET /api/groups/:id/expenses,<br/>  GET /api/groups/:id/settlements<br/>])<br/>Authorization: Bearer <token>

    par Parallel API calls (each runs verifyIdToken + checkMembership)
        B->>FA: verifyIdToken(token)
        FA-->>B: Decoded token (uid)
        B->>FS: groups/:id.get() → verify uid in members[]
        FS-->>B: Group doc { name, members[], created_by }
        B-->>R: 200 Group details
    and
        B->>FA: verifyIdToken(token)
        B->>FS: groups/:id.get() → verify membership
        B->>FS: Resolve each member uid → users/{uid}.get()
        FS-->>B: User profiles { id, displayName, email }
        B-->>R: 200 [members with display info]
    and
        B->>FA: verifyIdToken(token)
        B->>FS: groups/:id.get() → verify membership
        B->>FS: groups/:id/expenses.orderBy("createdAt", "desc")
        FS-->>B: Expense documents
        B-->>R: 200 [expenses]
    and
        B->>FA: verifyIdToken(token)
        B->>FS: groups/:id.get() → verify membership
        B->>FS: groups/:id/settlements.orderBy("createdAt", "desc")
        FS-->>B: Settlement documents
        B-->>R: 200 [settlements]
    end

    R->>R: buildOwedFromExpenses(expenses, memberIds)
    R->>R: applySettlements(rawOwed, settlements)
    R->>R: netBalancesForUser(adjusted, currentUid, memberIds)
    R-->>U: Render dashboard:<br/>• Members list (color-coded)<br/>• Balance cards (You owe / You are owed)<br/>• Per-person breakdowns<br/>• Recent activity feed<br/>• Navigation to Expenses, Personal Tracking, Settlements
```
