<template>
  <div>
    <NuxtRouteAnnouncer />
    <header class="site-header">
      <div class="site-header__inner">
        <NuxtLink to="/" class="site-header__brand">front<span class="site-header__brand-accent">wire</span></NuxtLink>
        <a
          href="https://github.com/GioManara96"
          target="_blank"
          rel="noopener"
          class="site-header__github"
          aria-label="Giovanni Manara on GitHub"
          ><Icon name="simple-icons:github"
        /></a>
      </div>
    </header>
    <main class="page">
      <NuxtPage />
    </main>
    <footer class="site-footer">
      <div class="site-footer__inner">
        Built by
        <a href="https://giovannimanara.dev" target="_blank" rel="noopener" class="site-footer__link"
          >Giovanni Manara</a
        >
      </div>
    </footer>
  </div>
</template>
