import {
  auth,
  db,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  getDocs,
  increment,
  serverTimestamp
} from "../firebase.js";

// בדיקה פשוטה - רק מנהלים עם מייל זה יוכלו לראות את הדשבורד:
const allowedAdmins = [
  "s0583212053@gmail.com",
  "p0583212053@gmail.com"
];

const activeUsersCountEl = document.getElementById("activeUsersCount");
const usersTableBody = document.getElementById("usersTableBody");
const createUserForm = document.getElementById("createUserForm");
const createUserMsg = document.getElementById("createUserMsg");
const livePagesList = document.getElementById("livePagesList");

// --- בדיקת הרשאות והתחברות ---

onAuthStateChanged(auth, user => {
  if (!user) {
    alert("אנא התחבר עם חשבון מנהל.");
    window.location.href = "../login.html"; // הפנה לדף התחברות שלך
    return;
  }
  if (!allowedAdmins.includes(user.email)) {
    alert("אין לך הרשאה לגשת לדשבורד זה.");
    signOut(auth);
    window.location.href = "../login.html";
    return;
  }
  // טען את כל המידע:
  loadActiveUsersCount();
  loadUsers();
  loadLivePages();
});

// --- טען כמה משתמשים פעילים (למשל שמורים ב-firestore מסמך מיוחד) ---
async function loadActiveUsersCount() {
  try {
    const docSnap = await getDoc(doc(db, "stats", "activeUsers"));
    if (docSnap.exists()) {
      const data = docSnap.data();
      activeUsersCountEl.textContent = data.count || 0;
    } else {
      activeUsersCountEl.textContent = "0";
    }
  } catch (e) {
    console.error("Error loading active users count:", e);
    activeUsersCountEl.textContent = "שגיאה";
  }
}

// --- טען את המשתמשים וכתוב בטבלה ---
async function loadUsers() {
  usersTableBody.innerHTML = "";
  try {
    const usersSnapshot = await getDocs(collection(db, "users"));
    usersSnapshot.forEach(docSnap => {
      const u = docSnap.data();
      const uid = docSnap.id;

      const tr = document.createElement("tr");

      // אימייל
      const emailTd = document.createElement("td");
      emailTd.textContent = u.email || "-";

      // סטטוס אישור
      const approvedTd = document.createElement("td");
      approvedTd.textContent = u.isApproved ? "✔️" : "❌";

      // חסום?
      const blockedTd = document.createElement("td");
      blockedTd.textContent = u.isBlocked ? "חסום" : "לא חסום";

      // כניסות
      const loginsTd = document.createElement("td");
      loginsTd.textContent = u.loginCount || 0;

      // כניסה אחרונה
      const lastLoginTd = document.createElement("td");
      if (u.lastLogin && u.lastLogin.toDate) {
        lastLoginTd.textContent = u.lastLogin.toDate().toLocaleString('he-IL');
      } else {
        lastLoginTd.textContent = "-";
      }

      // פעולות
      const actionsTd = document.createElement("td");

      // כפתור לאישור משתמש
      const approveBtn = document.createElement("button");
      approveBtn.textContent = "אשר";
      approveBtn.className = "approve";
      approveBtn.onclick = () => updateUserField(uid, "isApproved", true);

      // כפתור לחסימת משתמש
      const blockBtn = document.createElement("button");
      blockBtn.textContent = "חסום";
      blockBtn.className = "block";
      blockBtn.onclick = () => updateUserField(uid, "isBlocked", true);

      // כפתור לביטול חסימה
      const unblockBtn = document.createElement("button");
      unblockBtn.textContent = "בטל חסימה";
      unblockBtn.className = "approve";
      unblockBtn.onclick = () => updateUserField(uid, "isBlocked", false);

      actionsTd.appendChild(approveBtn);
      if (u.isBlocked) {
        actionsTd.appendChild(unblockBtn);
      } else {
        actionsTd.appendChild(blockBtn);
      }

      tr.appendChild(emailTd);
      tr.appendChild(approvedTd);
      tr.appendChild(blockedTd);
      tr.appendChild(loginsTd);
      tr.appendChild(lastLoginTd);
      tr.appendChild(actionsTd);

      usersTableBody.appendChild(tr);
    });
  } catch (e) {
    console.error("Error loading users:", e);
  }
}

// --- פונקציה לעדכון שדה משתמש ---
async function updateUserField(uid, field, value) {
  try {
    const userRef = doc(db, "users", uid);
    await updateDoc(userRef, { [field]: value });
    alert("עודכן בהצלחה!");
    loadUsers();
  } catch (e) {
    alert("שגיאה בעדכון: " + e.message);
  }
}

// --- יצירת משתמש חדש בדשבורד ---
createUserForm.addEventListener("submit", async e => {
  e.preventDefault();
  const email = document.getElementById("newUserEmail").value.trim();
  const password = document.getElementById("newUserPassword").value.trim();

  createUserMsg.textContent = "";
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // הוספת פרטים במסד הנתונים
    await setDoc(doc(db, "users", user.uid), {
      email: email,
      isApproved: false,
      isBlocked: false,
      loginCount: 0,
      lastLogin: null
    });

    createUserMsg.style.color = "green";
    createUserMsg.textContent = "משתמש נוצר בהצלחה!";
    createUserForm.reset();
    loadUsers();

  } catch (e) {
    createUserMsg.style.color = "red";
    createUserMsg.textContent = "שגיאה ביצירת משתמש: " + e.message;
  }
});

// --- טעינת דפים שנצפים בזמן אמת ---
// לשם כך צריך שתשמור בכל כניסה לדף/פעולה את דף המשתמש ב-firestore,
// כאן הדוגמה פשוטה - אנחנו קוראים את המסמך livePages בו מאוחסנים דפי הגלישה הנוכחיים
async function loadLivePages() {
  livePagesList.innerHTML = "<li>טוען...</li>";
  try {
    const docSnap = await getDoc(doc(db, "stats", "livePages"));
    if (docSnap.exists()) {
      const data = docSnap.data();
      livePagesList.innerHTML = "";
      for (const [uid, page] of Object.entries(data)) {
        const li = document.createElement("li");
        li.textContent = `משתמש ${uid}: צופה ב-${page}`;
        livePagesList.appendChild(li);
      }
    } else {
      livePagesList.innerHTML = "<li>אין נתונים זמינים כרגע</li>";
    }
  } catch (e) {
    livePagesList.innerHTML = "<li>שגיאה בטעינת נתונים</li>";
    console.error("Error loading live pages:", e);
  }
}
