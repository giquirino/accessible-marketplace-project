
document.addEventListener('DOMContentLoaded', function () {

  document.querySelectorAll('#barra-acoes').forEach(function (barra) {
    var chips = barra.querySelectorAll('.pilula');
    chips.forEach(function (chip) {
      chip.addEventListener('click', function () {
        chips.forEach(function (c) { c.classList.remove('ativo'); });
        chip.classList.add('ativo');
      });
    });
  });
});
