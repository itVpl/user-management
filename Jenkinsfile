pipeline {
  agent any
  options { timestamps(); disableConcurrentBuilds() }

  parameters {
    // NOTE: Agar frontend repo ke root me hai to build run karte waqt '.' pass karna.
    string(name: 'FRONTEND_DIR', defaultValue: 'frontend', description: 'Path to frontend folder (use "." if FE is at repo root)')
  }

  environment {
    APP_DIR = '/var/www/app'
  }

  stages {
    stage('Checkout') {
      steps { checkout scm }
    }

    stage('Node check') {
      steps {
        sh 'node -v || true'
        sh 'npm -v || true'
      }
    }

    stage('Install deps') {
      steps {
        sh '''
          set -e
          cd "${FRONTEND_DIR}"
          npm ci
        '''
      }
    }

    stage('Build') {
      steps {
        sh '''
          set -e
          cd "${FRONTEND_DIR}"
          npm run build
        '''
      }
    }

    stage('Deploy') {
      steps {
        sh '''
          set -e

          APP_DIR="${APP_DIR}"
          REL_DIR="$APP_DIR/releases/$(date +%Y%m%d-%H%M%S)"

          # Auto-detect build output (Vite=dist, CRA=build)
          if [ -d "$WORKSPACE/${FRONTEND_DIR}/dist" ]; then
            SRC="$WORKSPACE/${FRONTEND_DIR}/dist"
          elif [ -d "$WORKSPACE/${FRONTEND_DIR}/build" ]; then
            SRC="$WORKSPACE/${FRONTEND_DIR}/build"
          elif [ -d "$WORKSPACE/dist" ]; then
            SRC="$WORKSPACE/dist"
          elif [ -d "$WORKSPACE/build" ]; then
            SRC="$WORKSPACE/build"
          else
            echo "Build folder not found (dist/ or build/). Check FRONTEND_DIR param."
            exit 1
          fi

          echo "Using build source: $SRC"

          # New release
          mkdir -p "$REL_DIR"
          cp -r "$SRC/"* "$REL_DIR/"

          # Permissions so nginx can read
          sudo chown -R jenkins:jenkins "$REL_DIR"

          # Atomic switch to new release
          ln -sfn "$REL_DIR" "$APP_DIR/current"

          # Keep only last 3 releases (cleanup older)
          cd "$APP_DIR/releases"
          ls -1t | tail -n +4 | xargs -r rm -rf

          # Reload nginx
          sudo /usr/sbin/nginx -t
          sudo /bin/systemctl reload nginx

          echo "Deployed release: $(readlink -f $APP_DIR/current)"
        '''
      }
    }
  }

  post {
    success { echo "✅ Deployed successfully to ${env.APP_DIR}" }
    failure { echo "❌ Build/Deploy failed. Check console logs." }
  }
}
