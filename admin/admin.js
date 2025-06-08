import {
  auth,
  db,
  createUserWithEmailAndPassword,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  collection
} from "../firebase.js";

const clockEl = document.getElementById("clock");
const activeUsersCountEl = document.getElementById("activeUsersCount");
const livePagesList = document.getElementById("livePagesList");
const usersTableBody = document.getElementById("usersTableBody");
const createUserForm = document.getElementById("createUserForm");
const createUserMsg = document.getElementById("createUserMsg");

function updateClock() {
  const now = new Date();
  clockEl.textContent = now.toLocaleTimeString('he-IL');
}
setInterval(updateClock, 1000);
updateClock();

async function loadActiveUsersCount() {
  try {
    const docSnap = await getDoc(doc(db, "stats", "activeUsers"));
    activeUsersCountEl.textContent = docSnap.exists() ? docSnap.data().count || 0 : "0";
  } catch {
    activeUsersCountEl.textContent = "שגיאה";
  }
}

async function loadLivePages() {
  try {
    const docSnap = await getDoc(doc(db, "stats", "livePages"));
    if (docSnap.exists()) {
      const data = docSnap.data();
      livePagesList.innerHTML = "";
      for (const [uid, page] of Object.entries(data)) {
        const li = document.createElement("li");
        li.textContent = `משתמש ${uid} בדף: ${page}`;
        livePagesList.appendChild(li);
      }
    } else {
      livePagesList.innerHTML = "<li>אין מידע</li>";
    }
  } catch {
    livePagesList.innerHTML = "<li>שגיאה בטעינה</li>";
  }
}

async function loadUsers() {
  usersTableBody.innerHTML = "";
  const snapshot = await getDocs(collection(db, "users"));
  snapshot.forEach(docSnap => {
    const u = docSnap.data();
    const uid = docSnap.id;
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${u.email || "-"}</td>
      <td>${u.isApproved ? "✔️" : "❌"}</td>
      <td>${u.isBlocked ? "כן" : "לא"}</td>
      <td>${u.loginCount || 0}</td>
      <td>${u.lastLogin?.toDate?.().toLocaleString('he-IL') || "-"}</td>
      <td>
        <button onclick="updateUserField('${uid}', 'isApproved', true)">✔️</button>
        <button onclick="updateUserField('${uid}', 'isBlocked', ${!u.isBlocked})">${u.isBlocked ? "שחרר" : "חסום"}</button>
      </td>
    `;
    usersTableBody.appendChild(tr);
  });
}

window.updateUserField = async (uid, field, value) => {
  await updateDoc(doc(db, "users", uid), { [field]: value });
  loadUsers();
};

createUserForm.addEventListener("submit", async e => {
  e.preventDefault();
  const email = document.getElementById("newUserEmail").value.trim();
  const password = document.getElementById("newUserPassword").value.trim();
  createUserMsg.textContent = "";

  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await setDoc(doc(db, "users", cred.user.uid), {
      email,
      isApproved: false,
      isBlocked: false,
      loginCount: 0,
      lastLogin: null
    });
    createUserMsg.style.color = "green";
    createUserMsg.textContent = "משתמש נוצר";
    loadUsers();
  } catch (e) {
    createUserMsg.style.color = "red";
    createUserMsg.textContent = "שגיאה: " + e.message;
  }
});

// טעינה אוטומטית כל 5 שניות
function refreshAll() {
  loadActiveUsersCount();
  loadUsers();
  loadLivePages();
}
refreshAll();
setInterval(refreshAll, 5000);

// טען כל 5 שניות בלי לרענן את הדף (רק תוכן)
setInterval(() => {
  loadActiveUsersCount();
  loadUsers();
  loadLivePages();
}, 5000);

// הפעלה ראשונית
loadActiveUsersCount();
loadUsers();
loadLivePages();

