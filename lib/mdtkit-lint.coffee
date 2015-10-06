MdtkitLintView = require './mdtkit-lint-view'
{CompositeDisposable} = require 'atom'

module.exports = MdtkitLint =
  mdtkitLintView: null
  modalPanel: null
  subscriptions: null

  activate: (state) ->
    @mdtkitLintView = new MdtkitLintView(state.mdtkitLintViewState)
    @modalPanel = atom.workspace.addModalPanel(item: @mdtkitLintView.getElement(), visible: false)

    # Events subscribed to in atom's system can be easily cleaned up with a CompositeDisposable
    @subscriptions = new CompositeDisposable

    # Register command that toggles this view
    @subscriptions.add atom.commands.add 'atom-workspace', 'mdtkit-lint:toggle': => @toggle()

  deactivate: ->
    @modalPanel.destroy()
    @subscriptions.dispose()
    @mdtkitLintView.destroy()

  serialize: ->
    mdtkitLintViewState: @mdtkitLintView.serialize()

  toggle: ->
    console.log 'MdtkitLint was toggled!'

    if @modalPanel.isVisible()
      @modalPanel.hide()
    else
      @modalPanel.show()
