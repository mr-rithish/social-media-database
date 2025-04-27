const supabaseClient = supabase.createClient(
  'https://skkwxtwcbgrqodirtsnv.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNra3d4dHdjYmdycW9kaXJ0c252Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU1OTk5MzUsImV4cCI6MjA2MTE3NTkzNX0.QkhJ3LsqUCBfM3x2sPXa3qV8NG8EiCbUNRGrnWrZnqc'
);

let currentUser = null;

async function signup() {
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();
  const msg = document.getElementById("authMsg");

  if (!username || !password) {
    msg.textContent = "Please enter username and password.";
    return;
  }

  const { data: existing, error: fetchError } = await supabaseClient
    .from('users')
    .select('*')
    .eq('username', username)
    .maybeSingle();

  if (fetchError) {
    console.error(fetchError);
    msg.textContent = "Server error. Try again later.";
    return;
  }

  if (existing) {
    msg.textContent = "Username already exists.";
    return;
  }

  const { error: insertError } = await supabaseClient
    .from('users')
    .insert([{ username, password }]);

  if (insertError) {
    console.error(insertError);
    msg.textContent = "There was an issue with signing up.";
    return;
  }

  msg.style.color = "green";
  msg.textContent = "Signed up! Now log in.";
}

async function login() {
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();
  const msg = document.getElementById("authMsg");

  if (!username || !password) {
    msg.textContent = "Please enter username and password.";
    return;
  }

  const { data: user, error } = await supabaseClient
    .from('users')
    .select('*')
    .eq('username', username)
    .eq('password', password)
    .maybeSingle();

  if (error) {
    console.error(error);
    msg.textContent = "Server error. Try again.";
    return;
  }

  if (!user) {
    msg.textContent = "Invalid username or password.";
    return;
  }

  currentUser = user;
  document.getElementById("authSection").style.display = "none";
  document.getElementById("mainApp").style.display = "block";
  document.getElementById("currentUser").textContent = currentUser.username;
  loadFeed();
}

function logout() {
  currentUser = null;
  document.getElementById("authSection").style.display = "block";
  document.getElementById("mainApp").style.display = "none";
  document.getElementById("authMsg").textContent = "";
}

async function addPost() {
  const content = document.getElementById("postInput").value.trim();
  if (!content) return;

  const { error } = await supabaseClient
    .from('posts')
    .insert([{ content, user_id: currentUser.id }]);

  if (error) {
    console.error(error);
    return;
  }

  document.getElementById("postInput").value = "";
  loadFeed();
}

async function likePost(postId) {
  const { data: existing, error } = await supabaseClient
    .from('likes')
    .select('*')
    .eq('post_id', postId)
    .eq('user_id', currentUser.id)
    .maybeSingle();

  if (error) {
    console.error(error);
    return;
  }

  if (existing) {
    await supabaseClient.from('likes').delete().eq('id', existing.id);
  } else {
    await supabaseClient.from('likes').insert([{ post_id: postId, user_id: currentUser.id }]);
  }

  loadFeed();
}

async function addComment(postId, text) {
  if (!text.trim()) return;

  const { error } = await supabaseClient
    .from('comments')
    .insert([{ post_id: postId, user_id: currentUser.id, text }]);

  if (error) {
    console.error(error);
    return;
  }

  loadFeed();
}

async function loadFeed() {
  const { data: posts, error } = await supabaseClient
    .from('posts')
    .select('*, users(username), likes(*), comments(*, users(username))')
    .order('created_at', { ascending: false });

  if (error) {
    console.error(error);
    return;
  }

  const feed = document.getElementById("feed");
  feed.innerHTML = "";

  posts.forEach(post => {
    const postDiv = document.createElement("div");
    postDiv.className = "post";

    const liked = post.likes.some(like => like.user_id === currentUser.id);
    const likeText = liked ? "❤️" : "🤍";

    postDiv.innerHTML = `
      <p><strong>${post.users.username}</strong>: ${post.content}</p>
      <button onclick="likePost('${post.id}')">${likeText} Like (${post.likes.length})</button>
      <div class="comment-section">
        <input type="text" id="comment-${post.id}" placeholder="Comment..." />
        <button onclick="addComment('${post.id}', document.getElementById('comment-${post.id}').value)">Comment</button>
      </div>
      <div class="comments">
        ${post.comments.map(c => `
          <div class="comment">
            <strong>${c.users?.username || "Unknown"}</strong>: ${c.text}
          </div>
        `).join("")}
      </div>
    `;

    feed.appendChild(postDiv);
  });
}
