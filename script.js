// ===================================================================
// Nova Digital — Script principal (fond animé, formulaire, menu, animations)
// ===================================================================

  // WebGL Background Shader
  const canvas = document.getElementById('canvas-bg');
  const gl = canvas.getContext('webgl');

  if (gl) {
    const vertexShaderSource = `
      attribute vec2 a_position;
      varying vec2 v_texCoord;
      void main() {
        v_texCoord = a_position * 0.5 + 0.5;
        gl_Position = vec4(a_position, 0.0, 1.0);
      }
    `;

    const fragmentShaderSource = `
      precision highp float;
      varying vec2 v_texCoord;
      uniform float u_time;
      uniform vec2 u_resolution;

      void main() {
          vec2 uv = v_texCoord;
          
          // Base colors from the brand palette
          vec3 color1 = vec3(0.039, 0.039, 0.141); // #0A0A24 (Deep navy)
          vec3 color2 = vec3(0.071, 0.067, 0.180); // #12112E (Surface dark alt)
          vec3 accent = vec3(0.482, 0.471, 1.0); // #7B78FF (Vivid indigo accent)
          
          // Slow, fluid motion using multiple sine waves
          float noise = sin(uv.x * 2.0 + u_time * 0.2) * 0.5 + 0.5;
          noise += sin(uv.y * 3.0 - u_time * 0.3) * 0.5 + 0.5;
          noise *= 0.5;
          
          // Mixing background colors
          vec3 baseColor = mix(color1, color2, noise * 0.6);
          
          // Adding subtle "digital nodes" glow effect
          float glow = 0.0;
          vec2 p1 = vec2(0.8, 0.2);
          vec2 p2 = vec2(0.2, 0.7);
          
          float d1 = length(uv - p1 + vec2(sin(u_time*0.5)*0.1, cos(u_time*0.4)*0.1));
          float d2 = length(uv - p2 + vec2(cos(u_time*0.3)*0.1, sin(u_time*0.6)*0.1));
          
          glow += 0.02 / (d1 + 0.15);
          glow += 0.015 / (d2 + 0.2);
          
          vec3 finalColor = baseColor + accent * glow * 0.15;
          
          gl_FragColor = vec4(finalColor, 1.0);
      }
    `;

    function createShader(gl, type, source) {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      return shader;
    }

    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    const positionAttributeLocation = gl.getAttribLocation(program, "a_position");
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);

    const timeLocation = gl.getUniformLocation(program, "u_time");
    const resolutionLocation = gl.getUniformLocation(program, "u_resolution");

    function render(time) {
      time *= 0.001;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.useProgram(program);
      gl.enableVertexAttribArray(positionAttributeLocation);
      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
      gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);
      gl.uniform1f(timeLocation, time);
      gl.uniform2f(resolutionLocation, canvas.width, canvas.height);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      requestAnimationFrame(render);
    }
    requestAnimationFrame(render);
  }

  // ===================================================================
  // Envoi du formulaire de contact vers la boîte mail (via FormSubmit)
  // ===================================================================
  //
  // IMPORTANT — pourquoi les messages n'arrivaient peut-être pas dans la boîte mail :
  //
  // 1) ACTIVATION DE L'ADRESSE (cause la plus fréquente) : la toute première fois
  //    qu'une adresse mail est utilisée avec FormSubmit, le service envoie un email
  //    de confirmation à cette adresse ("Confirm your submission" / "Activate your
  //    form"). Tant que personne n'a cliqué sur le lien de confirmation dans cet
  //    email, TOUS les envois suivants sont silencieusement rejetés — y compris en
  //    AJAX. => Vérifier la boîte novadigital3223@gmail.com (et son dossier spam)
  //    pour un email de FormSubmit et cliquer sur le lien d'activation.
  //
  // 2) CORS / PROTOCOLE FILE:// : l'endpoint AJAX (/ajax/...) exige que le site soit
  //    servi via http:// ou https://. Si la page est ouverte directement depuis
  //    l'explorateur de fichiers (file:///...), le navigateur bloque la requête.
  //    => Le site doit être hébergé (ou testé via un petit serveur local) et non
  //    ouvert en double-cliquant sur le fichier.
  //
  // Pour rester fiable même si l'un de ces deux points n'est pas encore réglé, le
  // code ci-dessous tente d'abord l'envoi AJAX (sans rechargement de page) ; s'il
  // échoue, il bascule automatiquement sur un envoi "classique" du formulaire
  // (redirection vers FormSubmit puis retour sur le site), qui n'est pas soumis
  // aux mêmes restrictions CORS.

  const FORM_ENDPOINT = 'novadigital3223@gmail.com';

  async function handleContactSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const btn = form.querySelector('.submit-btn');
    const originalText = btn.textContent;
    btn.textContent = 'Envoi en cours...';
    btn.disabled = true;
    try {
      const formData = new FormData(form);
      const response = await fetch(`https://formsubmit.co/ajax/${FORM_ENDPOINT}`, {
        method: 'POST',
        headers: { 'Accept': 'application/json' },
        body: formData
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        // Affiche la vraie raison du refus renvoyée par FormSubmit (utile en debug)
        console.error('FormSubmit a refusé la requête :', response.status, data);
        throw new Error(data.message || `Échec de l'envoi (code ${response.status})`);
      }
      showSuccess(form, btn, originalText);
    } catch (err) {
      console.error('Erreur envoi AJAX, tentative en secours (envoi classique) :', err);
      // Secours : soumission classique du formulaire, sans fetch/CORS.
      submitClassicFallback(form);
    }
    return false;
  }

  function showSuccess(form, btn, originalText) {
    btn.textContent = 'Message envoyé ✓';
    btn.style.background = '#ffffff';
    btn.style.color = '#0A0A24';
    form.reset();
    setTimeout(() => {
      btn.textContent = originalText;
      btn.style.background = '';
      btn.style.color = '';
      btn.disabled = false;
    }, 4000);
  }

  function submitClassicFallback(form) {
    // Redirige le navigateur vers FormSubmit, qui renverra ensuite l'utilisateur
    // sur la page (ancre #contact-envoye) une fois le message envoyé.
    const nextUrl = window.location.href.split('#')[0] + '#contact-envoye';
    let nextField = form.querySelector('input[name="_next"]');
    if (!nextField) {
      nextField = document.createElement('input');
      nextField.type = 'hidden';
      nextField.name = '_next';
      form.appendChild(nextField);
    }
    nextField.value = nextUrl;
    form.action = `https://formsubmit.co/${FORM_ENDPOINT}`;
    form.method = 'POST';
    form.removeAttribute('onsubmit');
    form.submit();
  }

  // Si on revient d'un envoi classique (redirection FormSubmit), afficher la confirmation
  if (window.location.hash === '#contact-envoye') {
    const cf = document.getElementById('contact-form');
    if (cf) {
      const btn = cf.querySelector('.submit-btn');
      if (btn) {
        btn.textContent = 'Message envoyé ✓';
        btn.style.background = '#ffffff';
        btn.style.color = '#0A0A24';
      }
    }
  }

  // Mobile nav toggle
  const burger = document.getElementById('burger');
  const navlinks = document.getElementById('navlinks');
  burger.addEventListener('click', () => navlinks.classList.toggle('open'));
  navlinks.querySelectorAll('a').forEach(a => a.addEventListener('click', () => navlinks.classList.remove('open')));

  // Enhanced Scroll reveal with staggering
  const revealEls = document.querySelectorAll('.reveal');
  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if(entry.isIntersecting){
        // Add a small delay based on siblings to enhance stagger if they are in the same view
        entry.target.classList.add('in');
        io.unobserve(entry.target);
      }
    });
  }, { 
    threshold: 0.15,
    rootMargin: '0px 0px -50px 0px'
  });
  
  revealEls.forEach(el => io.observe(el));
