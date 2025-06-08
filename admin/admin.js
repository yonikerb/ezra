import {
  auth,
  db,
  createUserWithEmailAndPassword,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  getDocs,
  serverTimestamp
} from "../firebase.js";

const activeUsersCountEl = document.getElementById("activeUsersCount");
const usersTableBody = document.getElementById("usersTableBody");
const createUserForm = document.getElementById("createUserForm");
const createUserMsg = document.getElementById("createUserMsg");
const livePagesList = document.getElementById("livePagesList");

// --- שעון חי ---
function updateClock() {
  const clock = document.getElementById("clock");
  const now = new Date();
  clock.textContent = now.toLocaleTimeString('he-IL');
}
setInterval(updateClock, 1000);
updateClock();

// --- טען מידע כל שניה ---
setInterval(() => {
  loadActiveUsersCount();
  loadUsers();
  loadLivePages();
}, 1000);

// --- טען משתמשים פעילים ---
async function loadActiveUsersCount() {
  try {
    const docSnap = await getDoc(doc(db, "stats", "activeUsers"));
    if (docSnap.exists()) {
      const data = docSnap.data();
      activeUsersCountEl.textContent = data.count || 0;
    } else {
      activeUsersCountEl.textContent = "0";
    }
  } catch {
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

      const emailTd = document.createElement("td");
      emailTd.textContent = u.email || "-";

      const approvedTd = document.createElement("td");
      approvedTd.textContent = u.isApproved ? "✔️" : "❌";

      const blockedTd = document.createElement("td");
      blockedTd.textContent = u.isBlocked ? "חסום" : "לא חסום";

      const loginsTd = document.createElement("td");
      loginsTd.textContent = u.loginCount || 0;

      const lastLoginTd = document.createElement("td");
      if (u.lastLogin && u.lastLogin.toDate) {
        lastLoginTd.textContent = u.lastLogin.toDate().toLocaleString('he-IL');
      } else {
        lastLoginTd.textContent = "-";
      }

      const actionsTd = document.createElement("td");
      const approveBtn = document.createElement("button");
      approveBtn.textContent = "אשר";
      approveBtn.className = "approve";
      approveBtn.onclick = () => updateUserField(uid, "isApproved", true);

      const blockBtn = document.createElement("button");
      blockBtn.textContent = "חסום";
      blockBtn.className = "block";
      blockBtn.onclick = () => updateUserField(uid, "isBlocked", true);

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
    console.error("שגיאה בטעינת משתמשים:", e);
  }
}

// --- עדכון שדות משתמש ---
async function updateUserField(uid, field, value) {
  try {
    const userRef = doc(db, "users", uid);
    await updateDoc(userRef, { [field]: value });
  } catch (e) {
    alert("שגיאה: " + e.message);
  }
}

// --- יצירת משתמש חדש ---
createUserForm.addEventListener("submit", async e => {
  e.preventDefault();
  const email = document.getElementById("newUserEmail").value.trim();
  const password = document.getElementById("newUserPassword").value.trim();

  createUserMsg.textContent = "";
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

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
  } catch (e) {
    createUserMsg.style.color = "red";
    createUserMsg.textContent = "שגיאה: " + e.message;
  }
});

// --- טען דפים חיים ---
async function loadLivePages() {
  livePagesList.innerHTML = "<li>טוען...</li>";
  try {
    const docSnap = await getDoc(doc(db, "stats", "livePages"));
    if (docSnap.exists()) {
      const data = docSnap.data();
      livePagesList.innerHTML = "";
      for (const [uid, page] of Object.entries(data)) {
        const li = document.createElement("li");
        li.textContent = `משתמש ${uid}: ${page}`;
        livePagesList.appendChild(li);
      }
    } else {
      livePagesList.innerHTML = "<li>אין מידע</li>";
    }
  } catch {
    livePagesList.innerHTML = "<li>שגיאה</li>";
  }
}
