# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - main [ref=e2]:
    - generic [ref=e5]:
      - generic [ref=e6]:
        - link "Auxite" [ref=e7] [cursor=pointer]:
          - /url: /
          - img "Auxite" [ref=e8]
        - navigation [ref=e9]:
          - link "Piyasalar" [ref=e10] [cursor=pointer]:
            - /url: /
          - link "Biriktir" [ref=e11] [cursor=pointer]:
            - /url: /stake
          - link "Cüzdan" [ref=e12] [cursor=pointer]:
            - /url: /wallet
          - link "Profil" [ref=e13] [cursor=pointer]:
            - /url: /profile
      - generic [ref=e14]:
        - button "Light Mode" [ref=e15] [cursor=pointer]:
          - img [ref=e16]
        - button "🇹🇷 Türkçe" [ref=e19] [cursor=pointer]:
          - generic [ref=e20]: 🇹🇷
          - generic [ref=e21]: Türkçe
          - img [ref=e22]
        - button "Connect Wallet" [ref=e25] [cursor=pointer]:
          - generic [ref=e28]: Connect Wallet
    - generic [ref=e30]:
      - heading "Kiralamalarım" [level=2] [ref=e31]
      - paragraph [ref=e32]: Altın kiralaması yapın ve faiz kazanın.
    - generic [ref=e34]:
      - img [ref=e36]
      - heading "Cüzdan Bağlantısı Gerekli" [level=3] [ref=e38]
      - paragraph [ref=e39]: Kiralama işlemlerini görüntülemek ve yeni kiralama başlatmak için cüzdanınızı bağlayın.
      - button "Connect Wallet" [ref=e41] [cursor=pointer]:
        - generic [ref=e44]: Connect Wallet
  - alert [ref=e45]
```